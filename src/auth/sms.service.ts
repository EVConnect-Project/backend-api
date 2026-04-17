import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly appName: string;
  private readonly senderId: string;
  private readonly apiToken: string;
  private readonly oauthSendEndpoint: string;
  private readonly httpSendEndpoint: string;
  private readonly welcomeTemplate: string;
  private readonly accountDeletedTemplate: string;
  private readonly bookingRequestTemplate: string;
  private readonly bookingAcceptedTemplate: string;
  private readonly bookingPaymentReceivedTemplate: string;

  constructor(private configService: ConfigService) {
    this.appName = this.configService.get<string>("SMS_APP_NAME") || "EVRS";
    this.senderId =
      this.configService.get<string>("TEXTLK_SENDER_ID") || "EVRS";
    this.apiToken = this.configService.get<string>("TEXTLK_API_TOKEN") || "";
    this.welcomeTemplate =
      this.configService.get<string>("TEXTLK_WELCOME_MESSAGE_TEMPLATE") ||
      "Hi {{name}}! Welcome to {{appName}}. Power your journey with Sri Lanka’s growing EV network smart, simple, and seamless.";
    this.accountDeletedTemplate =
      this.configService.get<string>(
        "TEXTLK_ACCOUNT_DELETED_MESSAGE_TEMPLATE",
      ) ||
      "Hi {{name}}, your account is successfully deleted from {{appName}}.";
    this.bookingRequestTemplate =
      this.configService.get<string>(
        "TEXTLK_BOOKING_REQUEST_MESSAGE_TEMPLATE",
      ) ||
      "Hi {{name}}, you have a new booking request for {{chargerName}} from {{startTime}} to {{endTime}} on {{appName}}. Open the EVRS app -> My Chargers to accept or decline.";
    this.bookingAcceptedTemplate =
      this.configService.get<string>(
        "TEXTLK_BOOKING_ACCEPTED_MESSAGE_TEMPLATE",
      ) ||
      "Hi {{name}}, your booking for {{chargerName}} is accepted. Please proceed to payment in {{appName}} to confirm your session.Go to EVRS app -> My Bookings.";
    this.bookingPaymentReceivedTemplate =
      this.configService.get<string>(
        "TEXTLK_BOOKING_PAYMENT_RECEIVED_MESSAGE_TEMPLATE",
      ) ||
      "Hi {{name}}, payment is completed for booking at {{chargerName}} in {{appName}}. Please check My Chargers for the latest booking updates.";

    const oauthBase =
      this.configService.get<string>("TEXTLK_OAUTH_API_ENDPOINT") ||
      "https://app.text.lk/api/v3/";
    const httpBase =
      this.configService.get<string>("TEXTLK_HTTP_API_ENDPOINT") ||
      "https://app.text.lk/api/http/";

    this.oauthSendEndpoint = this.buildEndpoint(oauthBase, "sms/send");
    this.httpSendEndpoint = this.buildEndpoint(httpBase, "sms/send");

    if (!this.apiToken) {
      this.logger.warn(
        "TEXTLK_API_TOKEN not configured. SMS sending is disabled and OTP will only be logged in development.",
      );
    }
  }

  private buildEndpoint(base: string, path: string): string {
    const normalized = base.endsWith("/") ? base : `${base}/`;
    return new URL(path, normalized).toString();
  }

  private normalizePhoneNumber(rawPhoneNumber: string): string {
    const cleaned = String(rawPhoneNumber || "").replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+")) {
      return cleaned.slice(1);
    }

    if (cleaned.startsWith("0") && cleaned.length === 10) {
      return `94${cleaned.slice(1)}`;
    }

    if (cleaned.startsWith("94")) {
      return cleaned;
    }

    if (cleaned.length === 9 && cleaned.startsWith("7")) {
      return `94${cleaned}`;
    }

    return cleaned;
  }

  private async sendViaOAuth(
    recipient: string,
    message: string,
  ): Promise<boolean> {
    if (!this.apiToken) {
      return false;
    }

    try {
      const response = await fetch(this.oauthSendEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          recipient,
          sender_id: this.senderId,
          type: "plain",
          message,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        status?: boolean | string;
        message?: string;
      };

      if (
        !response.ok ||
        result.status === false ||
        result.status === "error"
      ) {
        this.logger.warn(
          `Text.lk OAuth send failed (${response.status}): ${result.message || "unknown error"}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Text.lk OAuth request error: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async sendViaHttp(
    recipient: string,
    message: string,
  ): Promise<boolean> {
    if (!this.apiToken) {
      return false;
    }

    try {
      const url = new URL(this.httpSendEndpoint);
      url.searchParams.set("recipient", recipient);
      url.searchParams.set("sender_id", this.senderId);
      url.searchParams.set("type", "plain");
      url.searchParams.set("message", message);
      url.searchParams.set("api_token", this.apiToken);

      const response = await fetch(url.toString(), { method: "GET" });
      const result = (await response.json().catch(() => ({}))) as {
        status?: boolean | string;
        message?: string;
      };

      if (
        !response.ok ||
        result.status === false ||
        result.status === "error"
      ) {
        this.logger.warn(
          `Text.lk HTTP send failed (${response.status}): ${result.message || "unknown error"}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Text.lk HTTP request error: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async sendMessage(
    phoneNumber: string,
    message: string,
  ): Promise<void> {
    const recipient = this.normalizePhoneNumber(phoneNumber);

    if (!this.apiToken) {
      throw new InternalServerErrorException(
        "SMS provider is not configured. Please contact support.",
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
      "Failed to send verification code. Please try again.",
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
      const fallbackName = "there";
      const resolvedName = (userName || "").trim() || fallbackName;
      const message = this.welcomeTemplate
        .replace(/\{\{\s*name\s*\}\}/g, resolvedName)
        .replace(/\{\{\s*appName\s*\}\}/g, this.appName);
      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(`Failed to send welcome SMS to ${phoneNumber}:`, error);
    }
  }

  /**
   * Send account-deleted SMS notification
   */
  async sendAccountDeletedSMS(
    phoneNumber: string,
    userName?: string,
  ): Promise<void> {
    try {
      const fallbackName = "there";
      const resolvedName = (userName || "").trim() || fallbackName;
      const message = this.accountDeletedTemplate
        .replace(/\{\{\s*name\s*\}\}/g, resolvedName)
        .replace(/\{\{\s*appName\s*\}\}/g, this.appName);
      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to send account-deleted SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  /**
   * Send SMS to charger owner for a new pending booking request.
   */
  async sendBookingRequestSMS(
    phoneNumber: string,
    payload: {
      ownerName?: string;
      chargerName: string;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<void> {
    try {
      const resolvedName = (payload.ownerName || "").trim() || "there";
      const startLabel = this.formatDateTime(payload.startTime);
      const endLabel = this.formatDateTime(payload.endTime);

      const message = this.bookingRequestTemplate
        .replace(/\{\{\s*name\s*\}\}/g, resolvedName)
        .replace(/\{\{\s*appName\s*\}\}/g, this.appName)
        .replace(/\{\{\s*chargerName\s*\}\}/g, payload.chargerName)
        .replace(/\{\{\s*startTime\s*\}\}/g, startLabel)
        .replace(/\{\{\s*endTime\s*\}\}/g, endLabel);

      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to send booking-request SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  /**
   * Send SMS to user when booking request is accepted by charger owner.
   */
  async sendBookingAcceptedSMS(
    phoneNumber: string,
    payload: {
      userName?: string;
      chargerName: string;
    },
  ): Promise<void> {
    try {
      const resolvedName = (payload.userName || "").trim() || "there";
      const message = this.bookingAcceptedTemplate
        .replace(/\{\{\s*name\s*\}\}/g, resolvedName)
        .replace(/\{\{\s*appName\s*\}\}/g, this.appName)
        .replace(/\{\{\s*chargerName\s*\}\}/g, payload.chargerName);

      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to send booking-accepted SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  /**
   * Send SMS to charger owner when booking payment is completed.
   */
  async sendBookingPaymentReceivedSMS(
    phoneNumber: string,
    payload: {
      ownerName?: string;
      chargerName: string;
    },
  ): Promise<void> {
    try {
      const resolvedName = (payload.ownerName || "").trim() || "there";
      const message = this.bookingPaymentReceivedTemplate
        .replace(/\{\{\s*name\s*\}\}/g, resolvedName)
        .replace(/\{\{\s*appName\s*\}\}/g, this.appName)
        .replace(/\{\{\s*chargerName\s*\}\}/g, payload.chargerName);

      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to send booking-payment-received SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  /**
   * Send SMS to user when admin responds/updates a support report.
   */
  async sendSupportReportResponseSMS(
    phoneNumber: string,
    payload: {
      responseMessage: string;
    },
  ): Promise<void> {
    try {
      const condensedResponse = payload.responseMessage
        .replace(/\s+/g, " ")
        .trim();
      const clippedResponse =
        condensedResponse.length > 160
          ? `${condensedResponse.slice(0, 157)}...`
          : condensedResponse;
      const message = clippedResponse || "No additional details provided.";

      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to send support-response SMS to ${phoneNumber}:`,
        error,
      );
    }
  }

  private formatDateTime(input: Date): string {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) {
      return "scheduled time";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
