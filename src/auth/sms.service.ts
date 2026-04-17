import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly senderId: string;
  private readonly apiToken: string;
  private readonly oauthSendEndpoint: string;
  private readonly httpSendEndpoint: string;

  constructor(private configService: ConfigService) {
    this.senderId = this.configService.get<string>('TEXTLK_SENDER_ID') || 'EVRS';
    this.apiToken = this.configService.get<string>('TEXTLK_API_TOKEN') || '';

    const oauthBase =
      this.configService.get<string>('TEXTLK_OAUTH_API_ENDPOINT') ||
      'https://app.text.lk/api/v3/';
    const httpBase =
      this.configService.get<string>('TEXTLK_HTTP_API_ENDPOINT') ||
      'https://app.text.lk/api/http/';

    this.oauthSendEndpoint = this.buildEndpoint(oauthBase, 'sms/send');
    this.httpSendEndpoint = this.buildEndpoint(httpBase, 'sms/send');

    if (!this.apiToken) {
      this.logger.warn(
        'TEXTLK_API_TOKEN not configured. SMS sending is disabled and OTP will only be logged in development.',
      );
    }
  }

  private buildEndpoint(base: string, path: string): string {
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return new URL(path, normalized).toString();
  }

  private normalizePhoneNumber(rawPhoneNumber: string): string {
    const cleaned = String(rawPhoneNumber || '').replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      return cleaned.slice(1);
    }

    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return `94${cleaned.slice(1)}`;
    }

    if (cleaned.startsWith('94')) {
      return cleaned;
    }

    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return `94${cleaned}`;
    }

    return cleaned;
  }

  private async sendViaOAuth(recipient: string, message: string): Promise<boolean> {
    if (!this.apiToken) {
      return false;
    }

    try {
      const response = await fetch(this.oauthSendEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          recipient,
          sender_id: this.senderId,
          type: 'plain',
          message,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        status?: boolean | string;
        message?: string;
      };

      if (!response.ok || result.status === false || result.status === 'error') {
        this.logger.warn(
          `Text.lk OAuth send failed (${response.status}): ${result.message || 'unknown error'}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Text.lk OAuth request error: ${(error as Error).message}`);
      return false;
    }
  }

  private async sendViaHttp(recipient: string, message: string): Promise<boolean> {
    if (!this.apiToken) {
      return false;
    }

    try {
      const url = new URL(this.httpSendEndpoint);
      url.searchParams.set('recipient', recipient);
      url.searchParams.set('sender_id', this.senderId);
      url.searchParams.set('type', 'plain');
      url.searchParams.set('message', message);
      url.searchParams.set('api_token', this.apiToken);

      const response = await fetch(url.toString(), { method: 'GET' });
      const result = (await response.json().catch(() => ({}))) as {
        status?: boolean | string;
        message?: string;
      };

      if (!response.ok || result.status === false || result.status === 'error') {
        this.logger.warn(
          `Text.lk HTTP send failed (${response.status}): ${result.message || 'unknown error'}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Text.lk HTTP request error: ${(error as Error).message}`);
      return false;
    }
  }

  private async sendMessage(phoneNumber: string, message: string): Promise<void> {
    const recipient = this.normalizePhoneNumber(phoneNumber);

    if (!this.apiToken) {
      throw new InternalServerErrorException(
        'SMS provider is not configured. Please contact support.',
      );
    }

    const oauthSuccess = await this.sendViaOAuth(recipient, message);
    if (oauthSuccess) {
      this.logger.log(`SMS sent via OAuth to ${recipient}`);
      return;
    }

    const httpSuccess = await this.sendViaHttp(recipient, message);
    if (httpSuccess) {
      this.logger.log(`SMS sent via HTTP fallback to ${recipient}`);
      return;
    }

    throw new InternalServerErrorException(
      'Failed to send verification code. Please try again.',
    );
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your EVRS verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send welcome SMS after successful registration
   */
  async sendWelcomeSMS(phoneNumber: string, userName?: string): Promise<void> {
    try {
      const greeting = userName ? `Hi ${userName}` : 'Hello';
      const message = `${greeting}! Welcome to EVRS. Start finding and booking EV charging stations near you.`;
      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(`Failed to send welcome SMS to ${phoneNumber}:`, error);
    }
  }
}
