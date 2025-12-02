import { Controller, Post, Delete, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  async saveFcmToken(
    @Body() saveTokenDto: SaveFcmTokenDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    await this.notificationsService.saveFcmToken(
      userId,
      saveTokenDto.fcmToken,
      saveTokenDto.platform,
      saveTokenDto.deviceId,
    );

    return {
      success: true,
      message: 'FCM token saved successfully',
    };
  }

  @Delete('token/:token')
  async removeFcmToken(@Param('token') token: string) {
    await this.notificationsService.removeFcmToken(token);
    return {
      success: true,
      message: 'FCM token removed successfully',
    };
  }

  @Get('history')
  async getNotificationHistory(@Request() req) {
    const userId = req.user.userId;
    const notifications = await this.notificationsService.getNotificationHistory(userId);
    return {
      success: true,
      notifications,
    };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Post('test')
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
      message: 'Test notification sent',
    };
  }

  @Get('preferences')
  async getPreferences(@Request() req) {
    const userId = req.user.userId;
    const preferences = await this.notificationsService.getUserPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  @Patch('preferences')
  async updatePreferences(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const preferences = await this.notificationsService.updateUserPreferences(
      userId,
      body.preferences,
    );

    return {
      success: true,
      message: 'Notification preferences updated',
      data: preferences,
    };
  }
}
