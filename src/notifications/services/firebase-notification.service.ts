import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface EmergencyNotificationData {
  emergencyId: string;
  mechanicId: string;
  mechanicName: string;
  status: 'en_route' | 'arrived' | 'working' | 'completed' | 'delayed' | 'cancelled';
  eta?: number;
  location?: { lat: number; lng: number };
  problemType?: string;
}

@Injectable()
export class FirebaseNotificationService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseNotificationService.name);
  private firebaseApp: admin.app.App;

  async onModuleInit(): Promise<void> {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccount) {
        this.logger.warn('Firebase service account path not configured. Push notifications will be disabled.');
        return;
      }

      if (!admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        this.firebaseApp = admin.app();
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(fcmToken: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'emergency_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to device: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      return false;
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(fcmTokens: string[], payload: NotificationPayload): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping notifications');
      return { successCount: 0, failureCount: fcmTokens.length, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'emergency_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(fcmTokens[idx]);
        }
      });

      this.logger.log(
        `Multicast notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send multicast notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      return { successCount: 0, failureCount: fcmTokens.length, invalidTokens: [] };
    }
  }

  /**
   * Send emergency status update notification
   */
  async sendEmergencyStatusNotification(
    fcmToken: string,
    data: EmergencyNotificationData,
  ): Promise<boolean> {
    const template = this.getEmergencyNotificationTemplate(data);
    return this.sendToDevice(fcmToken, {
      title: template.title,
      body: template.body,
      data: {
        type: 'emergency_update',
        emergencyId: data.emergencyId,
        mechanicId: data.mechanicId,
        status: data.status,
        ...(data.eta && { eta: data.eta.toString() }),
      },
    });
  }

  /**
   * Send mechanic assignment notification
   */
  async sendMechanicAssignedNotification(
    fcmToken: string,
    emergencyId: string,
    mechanicName: string,
    eta: number,
  ): Promise<boolean> {
    return this.sendToDevice(fcmToken, {
      title: '🔧 Mechanic Assigned',
      body: `${mechanicName} will arrive in approximately ${eta} minutes`,
      data: {
        type: 'mechanic_assigned',
        emergencyId,
        eta: eta.toString(),
      },
    });
  }

  /**
   * Send emergency alert to nearby mechanics
   */
  async sendEmergencyAlertToMechanics(
    mechanicTokens: string[],
    emergencyId: string,
    problemType: string,
    location: string,
    distance: number,
  ): Promise<void> {
    await this.sendToDevices(mechanicTokens, {
      title: '🚨 Emergency Request Nearby',
      body: `${problemType} - ${distance.toFixed(1)}km away at ${location}`,
      data: {
        type: 'emergency_alert',
        emergencyId,
        problemType,
      },
    });
  }

  /**
   * Get notification template based on emergency status
   */
  private getEmergencyNotificationTemplate(data: EmergencyNotificationData): {
    title: string;
    body: string;
  } {
    const mechanicName = data.mechanicName;

    switch (data.status) {
      case 'en_route':
        return {
          title: '🚗 Mechanic On The Way',
          body: data.eta
            ? `${mechanicName} is on the way! ETA: ${data.eta} minutes`
            : `${mechanicName} is on the way to your location`,
        };

      case 'arrived':
        return {
          title: '📍 Mechanic Arrived',
          body: `${mechanicName} has arrived at your location`,
        };

      case 'working':
        return {
          title: '🔧 Service Started',
          body: `${mechanicName} has started working on your vehicle`,
        };

      case 'completed':
        return {
          title: '✅ Service Completed',
          body: `${mechanicName} has completed the service. Tap to review.`,
        };

      case 'delayed':
        return {
          title: '⏱️ Slight Delay',
          body: data.eta
            ? `${mechanicName} is running late. New ETA: ${data.eta} minutes`
            : `${mechanicName} is experiencing a delay`,
        };

      case 'cancelled':
        return {
          title: '❌ Service Cancelled',
          body: `Your emergency request has been cancelled`,
        };

      default:
        return {
          title: '🔔 Emergency Update',
          body: `Update from ${mechanicName}`,
        };
    }
  }

  /**
   * Subscribe to topic for broadcast notifications
   */
  async subscribeToTopic(fcmTokens: string[], topic: string): Promise<void> {
    if (!this.firebaseApp) {
      return;
    }

    try {
      await admin.messaging().subscribeToTopic(fcmTokens, topic);
      this.logger.log(`Subscribed ${fcmTokens.length} devices to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${error.message}`, error);
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(fcmTokens: string[], topic: string): Promise<void> {
    if (!this.firebaseApp) {
      return;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
      this.logger.log(`Unsubscribed ${fcmTokens.length} devices from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic: ${error.message}`, error);
    }
  }

  /**
   * Validate FCM token
   */
  async validateToken(fcmToken: string): Promise<boolean> {
    if (!this.firebaseApp) {
      return false;
    }

    try {
      // Try sending a dry-run message to validate token
      await admin.messaging().send({
        token: fcmToken,
        data: { test: 'validation' },
      }, true);
      return true;
    } catch (error) {
      return false;
    }
  }
}
