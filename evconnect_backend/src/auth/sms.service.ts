import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private twilioClient: Twilio | null = null;
  private readonly logger = new Logger(SmsService.name);
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn(
        'Twilio credentials not configured. SMS sending will be disabled.',
      );
      return;
    }

    this.twilioClient = new Twilio(accountSid, authToken);
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn(
        `SMS disabled - OTP for ${phoneNumber}: ${otp} (Development mode)`,
      );
      // In development, just log the OTP
      console.log(`\n🔐 OTP for ${phoneNumber}: ${otp}\n`);
      return;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: `Your EVRS verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
        from: this.fromNumber,
        to: phoneNumber,
      });

      this.logger.log(`SMS sent successfully to ${phoneNumber}: ${message.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      
      // In development, still log the OTP even if Twilio fails
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        console.log(`\n🔐 OTP for ${phoneNumber}: ${otp} (Twilio failed, development fallback)\n`);
        return;
      }
      
      throw new InternalServerErrorException(
        'Failed to send verification code. Please try again.',
      );
    }
  }

  /**
   * Send welcome SMS after successful registration
   */
  async sendWelcomeSMS(phoneNumber: string, userName?: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn(`SMS disabled - Welcome message for ${phoneNumber}`);
      return;
    }

    try {
      const greeting = userName ? `Hi ${userName}` : 'Hello';
      const message = await this.twilioClient.messages.create({
        body: `${greeting}! Welcome to EVRS - Connecting to EV World. Start finding and booking EV charging stations near you!`,
        from: this.fromNumber,
        to: phoneNumber,
      });

      this.logger.log(`Welcome SMS sent to ${phoneNumber}: ${message.sid}`);
    } catch (error) {
      // Don't throw error for welcome SMS, just log it
      this.logger.error(`Failed to send welcome SMS to ${phoneNumber}:`, error);
    }
  }
}
