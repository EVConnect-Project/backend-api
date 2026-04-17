import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Query,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { FirebaseNotificationService } from "./services/firebase-notification.service";
import { SaveFcmTokenDto } from "./dto/save-fcm-token.dto";
import { SendNotificationDto } from "./dto/send-notification.dto";
import {
  UpdateFcmTokenDto,
  NotificationPreferencesDto,
  SendTestNotificationDto,
  SendEmergencyNotificationDto,
  NotificationResponse,
} from "./dto/notification.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly firebaseNotificationService: FirebaseNotificationService,
  ) {}

  @Post("token")
  async saveFcmToken(@Body() saveTokenDto: SaveFcmTokenDto, @Request() req) {
    const userId = req.user.userId;
    await this.notificationsService.saveFcmToken(
      userId,
      saveTokenDto.fcmToken,
      saveTokenDto.platform,
      saveTokenDto.deviceId,
    );

    return {
      success: true,
      message: "FCM token saved successfully",
    };
  }

  @Delete("token/:token")
  async removeFcmToken(@Param("token") token: string) {
    await this.notificationsService.removeFcmToken(token);
    return {
      success: true,
      message: "FCM token removed successfully",
    };
  }

  @Get("history")
  async getNotificationHistory(
    @Request() req,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const userId = req.user.userId;
    const result = await this.notificationsService.getNotificationHistory(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      success: true,
      notifications: result.notifications,
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  @Get("unread-count")
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return {
      success: true,
      count,
    };
  }

  @Patch("mark-all-read")
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      message: `${count} notifications marked as read`,
      count,
    };
  }

  @Delete("clear-all")
  async clearAll(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.clearAllNotifications(userId);
    return {
      success: true,
      message: `${count} notifications deleted`,
      count,
    };
  }

  @Delete(":id")
  async deleteNotification(@Param("id") id: string, @Request() req) {
    const userId = req.user.userId;
    const deleted = await this.notificationsService.deleteNotification(
      userId,
      id,
    );
    return {
      success: deleted,
      message: deleted ? "Notification deleted" : "Notification not found",
    };
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req) {
    const userId = req.user.userId;
    const marked = await this.notificationsService.markAsRead(userId, id);
    return {
      success: marked,
      message: marked
        ? "Notification marked as read"
        : "Notification not found",
    };
  }

  @Post("test")
  async sendTestNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @Request() req,
  ) {
    // Only allow sending test to own user for security
    const userId = req.user.userId;

    await this.notificationsService.sendToUser(
      userId,
      sendNotificationDto.type as any,
      {
        title: sendNotificationDto.title,
        body: sendNotificationDto.body,
        data: sendNotificationDto.data,
      },
    );

    return {
      success: true,
      message: "Test notification sent",
    };
  }

  @Get("preferences")
  async getPreferences(@Request() req) {
    const userId = req.user.userId;
    const preferences =
      await this.notificationsService.getUserPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  @Patch("preferences")
  async updatePreferences(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const preferences = await this.notificationsService.updateUserPreferences(
      userId,
      body.preferences,
    );

    return {
      success: true,
      message: "Notification preferences updated",
      data: preferences,
    };
  }

  // New Firebase notification endpoints

  @Post("fcm-token")
  async updateFcmToken(
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
    @Request() req,
  ): Promise<NotificationResponse> {
    const userId = req.user.userId;
    // Save FCM token to user record
    await this.notificationsService.updateUserFcmToken(
      userId,
      updateFcmTokenDto.fcmToken,
    );

    return {
      success: true,
      message: "FCM token updated successfully",
    };
  }

  @Post("emergency/send")
  async sendEmergencyNotification(
    @Body() sendEmergencyDto: SendEmergencyNotificationDto,
    @Request() req,
  ): Promise<NotificationResponse> {
    const userId = req.user.userId;

    // Get user's FCM token
    const userFcmToken =
      await this.notificationsService.getUserFcmToken(userId);

    if (!userFcmToken) {
      return {
        success: false,
        message: "User FCM token not found",
      };
    }

    const success =
      await this.firebaseNotificationService.sendEmergencyStatusNotification(
        userFcmToken,
        {
          emergencyId: sendEmergencyDto.emergencyId,
          mechanicId: sendEmergencyDto.mechanicId,
          mechanicName: sendEmergencyDto.mechanicName,
          status: sendEmergencyDto.status,
          eta: sendEmergencyDto.eta,
          problemType: sendEmergencyDto.problemType,
        },
      );

    return {
      success,
      message: success
        ? "Emergency notification sent"
        : "Failed to send notification",
    };
  }

  @Post("test-notification")
  async sendTestNotificationFirebase(
    @Body() testDto: SendTestNotificationDto,
    @Request() req,
  ): Promise<NotificationResponse> {
    const userId = req.user.userId;
    const fcmToken = await this.notificationsService.getUserFcmToken(userId);

    if (!fcmToken) {
      return {
        success: false,
        message: "FCM token not found",
      };
    }

    const success = await this.firebaseNotificationService.sendToDevice(
      fcmToken,
      {
        title: testDto.title,
        body: testDto.body,
        data: testDto.data,
      },
    );

    return {
      success,
      message: success
        ? "Test notification sent"
        : "Failed to send notification",
    };
  }

  @Post("validate-token")
  async validateFcmToken(
    @Body() body: { fcmToken: string },
  ): Promise<{ valid: boolean }> {
    const valid = await this.firebaseNotificationService.validateToken(
      body.fcmToken,
    );
    return { valid };
  }
}
