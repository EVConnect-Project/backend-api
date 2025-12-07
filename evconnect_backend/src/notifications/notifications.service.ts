import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FcmTokenEntity } from './entities/fcm-token.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { NotificationType, NotificationPayload } from './types/notification-types';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(FcmTokenEntity)
    private fcmTokenRepository: Repository<FcmTokenEntity>,
    @InjectRepository(NotificationLogEntity)
    private notificationLogRepository: Repository<NotificationLogEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private notificationPreferenceRepository: Repository<NotificationPreferenceEntity>,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const projectId = this.configService.get('FIREBASE_PROJECT_ID');
      const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
      const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');

      if (!projectId || !privateKey || !clientEmail) {
        this.logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });

      this.logger.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Save or update FCM token for a user
   */
  async saveFcmToken(
    userId: string,
    fcmToken: string,
    platform: 'ios' | 'android' | 'web',
    deviceId?: string,
  ): Promise<FcmTokenEntity> {
    // Check if token already exists
    let tokenEntity = await this.fcmTokenRepository.findOne({
      where: { fcmToken },
    });

    if (tokenEntity) {
      // Update existing token
      tokenEntity.userId = userId;
      tokenEntity.platform = platform;
      tokenEntity.deviceId = deviceId || tokenEntity.deviceId;
      tokenEntity.isActive = true;
    } else {
      // Create new token
      tokenEntity = this.fcmTokenRepository.create({
        userId,
        fcmToken,
        platform,
        deviceId,
        isActive: true,
      });
    }

    const saved = await this.fcmTokenRepository.save(tokenEntity);
    this.logger.log(`✅ FCM token saved for user ${userId} (${platform})`);
    return saved;
  }

  /**
   * Remove FCM token (on logout)
   */
  async removeFcmToken(fcmToken: string): Promise<void> {
    await this.fcmTokenRepository.delete({ fcmToken });
    this.logger.log(`🗑️ FCM token removed: ${fcmToken.substring(0, 20)}...`);
  }

  /**
   * Get all active tokens for a user
   */
  async getUserTokens(userId: string): Promise<FcmTokenEntity[]> {
    return this.fcmTokenRepository.find({
      where: { userId, isActive: true },
    });
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    // Check if user has enabled this notification type
    const isEnabled = await this.isNotificationEnabled(userId, type);
    if (!isEnabled) {
      this.logger.log(`Notification type ${type} is disabled for user ${userId}`);
      return;
    }

    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      this.logger.warn(`No active FCM tokens found for user ${userId}`);
      return;
    }

    // Create notification log
    const log = this.notificationLogRepository.create({
      userId,
      type,
      title: payload.title,
      body: payload.body,
      data: payload.data || null,
      status: 'pending',
    });
    await this.notificationLogRepository.save(log);

    // Send to all user's devices
    const sendPromises = tokens.map((token) =>
      this.sendToToken(token.fcmToken, payload, type),
    );

    try {
      await Promise.all(sendPromises);
      log.status = 'sent';
      log.sentAt = new Date();
      await this.notificationLogRepository.save(log);
      this.logger.log(`✅ Notification sent to user ${userId} (${tokens.length} devices)`);
    } catch (error) {
      log.status = 'failed';
      await this.notificationLogRepository.save(log);
      this.logger.error(`❌ Failed to send notification to user ${userId}`, error);
    }
  }

  /**
   * Send notification to a specific FCM token
   */
  private async sendToToken(
    fcmToken: string,
    payload: NotificationPayload,
    type: string,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping notification send.');
      return;
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type,
        ...(payload.data || {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: this.getChannelId(type),
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (error: any) {
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Invalid token, marking as inactive: ${fcmToken.substring(0, 20)}...`);
        await this.fcmTokenRepository.update({ fcmToken }, { isActive: false });
      }
      throw error;
    }
  }

  /**
   * Get notification channel ID based on type
   */
  private getChannelId(type: string): string {
    if (type.startsWith('charging')) {
      return 'charging_channel';
    }
    if (type.startsWith('booking')) {
      return 'booking_channel';
    }
    if (type.startsWith('payment')) {
      return 'payment_channel';
    }
    return 'general_channel';
  }

  /**
   * Send charging started notification
   */
  async sendChargingStarted(
    userId: string,
    chargerId: string,
    chargerName: string,
    sessionId?: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGING_STARTED, {
      title: '⚡ Charging Started',
      body: `Your EV is now charging at ${chargerName}`,
      data: {
        chargerId,
        sessionId,
        navigate: sessionId ? `/sessions/${sessionId}` : '/sessions',
      },
    });
  }

  /**
   * Send charging 80% notification
   */
  async sendCharging80Percent(
    userId: string,
    chargerId: string,
    chargerName: string,
    sessionId?: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGING_80_PERCENT, {
      title: '🔋 80% Charged',
      body: `Your EV at ${chargerName} is 80% charged. Consider unplugging for optimal battery health.`,
      data: {
        chargerId,
        sessionId,
        navigate: sessionId ? `/sessions/${sessionId}` : '/sessions',
      },
    });
  }

  /**
   * Send charging completed notification
   */
  async sendChargingCompleted(
    userId: string,
    chargerId: string,
    chargerName: string,
    sessionId?: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGING_COMPLETED, {
      title: '✅ Charging Complete',
      body: `Your EV at ${chargerName} is fully charged!`,
      data: {
        chargerId,
        sessionId,
        navigate: sessionId ? `/sessions/${sessionId}` : '/sessions',
      },
    });
  }

  /**
   * Send booking confirmed notification
   */
  async sendBookingConfirmed(
    userId: string,
    bookingId: string,
    chargerName: string,
    startTime: Date,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.BOOKING_CONFIRMED, {
      title: '📅 Booking Confirmed',
      body: `Your booking at ${chargerName} for ${startTime.toLocaleString()} is confirmed`,
      data: {
        bookingId,
        navigate: `/bookings/${bookingId}`,
      },
    });
  }

  /**
   * Send booking reminder notification
   */
  async sendBookingReminder(
    userId: string,
    bookingId: string,
    chargerName: string,
    minutesUntil: number,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.BOOKING_REMINDER, {
      title: '⏰ Booking Reminder',
      body: `Your booking at ${chargerName} starts in ${minutesUntil} minutes`,
      data: {
        bookingId,
        navigate: `/bookings/${bookingId}`,
      },
    });
  }

  /**
   * Send booking auto-cancelled notification
   */
  async sendBookingAutoCancelled(
    userId: string,
    bookingId: string,
    chargerName: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.BOOKING_AUTO_CANCELLED, {
      title: '❌ Booking Auto-Cancelled',
      body: `Your booking at ${chargerName} was cancelled due to no-show`,
      data: {
        bookingId,
        navigate: '/bookings',
      },
    });
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccess(
    userId: string,
    amount: number,
    paymentId: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.PAYMENT_SUCCESS, {
      title: '💳 Payment Successful',
      body: `Payment of $${amount.toFixed(2)} processed successfully`,
      data: {
        paymentId,
        navigate: `/payments/${paymentId}`,
      },
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(
    userId: string,
    amount: number,
    paymentId: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.PAYMENT_FAILED, {
      title: '❌ Payment Failed',
      body: `Payment of $${amount.toFixed(2)} could not be processed`,
      data: {
        paymentId,
        navigate: `/payments/${paymentId}`,
      },
    });
  }

  /**
   * Send mechanic assigned notification
   */
  async sendMechanicAssigned(
    userId: string,
    requestId: string,
    mechanicName: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.MECHANIC_ASSIGNED, {
      title: '🔧 Mechanic Assigned',
      body: `${mechanicName} has been assigned to your breakdown request`,
      data: {
        requestId,
        navigate: `/breakdown/${requestId}`,
      },
    });
  }

  /**
   * Send service completed notification
   */
  async sendServiceCompleted(
    userId: string,
    requestId: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.SERVICE_COMPLETED, {
      title: '✅ Service Completed',
      body: 'Your breakdown service has been completed successfully',
      data: {
        requestId,
        navigate: `/breakdown/${requestId}`,
      },
    });
  }

  /**
   * Send charger available nearby notification
   */
  async sendChargerAvailableNearby(
    userId: string,
    chargerName: string,
    distance: number,
    chargerId: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGER_AVAILABLE_NEARBY, {
      title: '⚡ Charger Available Nearby',
      body: `${chargerName} is now available ${distance.toFixed(1)} km away`,
      data: {
        chargerId,
        distance,
        navigate: `/chargers/${chargerId}`,
      },
    });
  }

  /**
   * Send price drop alert notification
   */
  async sendPriceDropAlert(
    userId: string,
    chargerName: string,
    oldPrice: number,
    newPrice: number,
    chargerId: string,
  ): Promise<void> {
    const discount = ((oldPrice - newPrice) / oldPrice * 100).toFixed(0);
    await this.sendToUser(userId, NotificationType.PRICE_DROP_ALERT, {
      title: '💰 Price Drop Alert',
      body: `${chargerName} price dropped by ${discount}%! Now $${newPrice.toFixed(2)}/kWh`,
      data: {
        chargerId,
        oldPrice,
        newPrice,
        discount: parseInt(discount),
        navigate: `/chargers/${chargerId}`,
      },
    });
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
  ): Promise<NotificationLogEntity[]> {
    return this.notificationLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationLogRepository.update(
      { id: notificationId },
      { status: 'read', readAt: new Date() },
    );
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    return this.notificationPreferenceRepository.find({
      where: { userId },
      order: { notificationType: 'ASC' },
    });
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: { type: string; enabled: boolean }[],
  ): Promise<NotificationPreferenceEntity[]> {
    const results: NotificationPreferenceEntity[] = [];

    for (const pref of preferences) {
      let preference = await this.notificationPreferenceRepository.findOne({
        where: { userId, notificationType: pref.type },
      });

      if (preference) {
        // Update existing preference
        preference.enabled = pref.enabled;
        await this.notificationPreferenceRepository.save(preference);
      } else {
        // Create new preference
        preference = this.notificationPreferenceRepository.create({
          userId,
          notificationType: pref.type,
          enabled: pref.enabled,
        });
        await this.notificationPreferenceRepository.save(preference);
      }

      results.push(preference);
    }

    return results;
  }

  /**
   * Check if user has enabled a specific notification type
   */
  async isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const preference = await this.notificationPreferenceRepository.findOne({
      where: { userId, notificationType: type },
    });

    // Default to enabled if no preference is set
    return preference ? preference.enabled : true;
  }

  /**
   * Send charger approved notification
   */
  async sendChargerApproved(
    userId: string,
    chargerName: string,
    chargerId: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGER_APPROVED, {
      title: '✅ Charger Approved',
      body: `Your charger "${chargerName}" has been approved and is now live!`,
      data: {
        chargerId,
        chargerName,
        screen: 'OwnerDashboard',
      },
    });
  }

  /**
   * Send charger rejected notification
   */
  async sendChargerRejected(
    userId: string,
    chargerName: string,
    reason: string,
  ): Promise<void> {
    await this.sendToUser(userId, NotificationType.CHARGER_REJECTED, {
      title: '❌ Charger Rejected',
      body: `Your charger "${chargerName}" was rejected. Reason: ${reason}`,
      data: {
        chargerName,
        reason,
        screen: 'ConnectWithEV',
      },
    });
  }
}
