import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * ChargingService handles OCPP charging station operations.
 *
 * NOTE: Charging notifications (started, 80%, completed) should be triggered
 * by OCPP webhooks from the ev-charging-service. Add webhook endpoints to
 * receive these events and call:
 * - notificationsService.sendChargingStarted()
 * - notificationsService.sendCharging80Percent()
 * - notificationsService.sendChargingCompleted()
 */
@Injectable()
export class ChargingService {
  private readonly logger = new Logger(ChargingService.name);
  private readonly chargingServiceUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.chargingServiceUrl = this.configService.get<string>(
      "CHARGING_SERVICE_URL",
      "http://localhost:4000",
    );
    this.apiKey = this.configService.get<string>(
      "CHARGING_SERVICE_API_KEY",
      "evconnect-backend-api-key-dev",
    );
  }

  private getHeaders() {
    return {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getAvailableChargers() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/chargers`, {
          headers: this.getHeaders(),
          params: { isOnline: true, status: "Available" },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to fetch available chargers", error.message);
      throw new HttpException(
        "Failed to fetch chargers",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getConnectedChargers() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/chargers/connected`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to fetch connected chargers", error.message);
      throw new HttpException(
        "Failed to fetch chargers",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getChargerDetails(chargerId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/chargers/${chargerId}`,
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch charger ${chargerId}`, error.message);
      throw new HttpException("Charger not found", HttpStatus.NOT_FOUND);
    }
  }

  async getChargerByIdentity(chargeBoxIdentity: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/chargers/by-identity/${chargeBoxIdentity}`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch charger by identity ${chargeBoxIdentity}`,
        error.message,
      );
      throw new HttpException(
        "Charger not found or not connected",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async createSession(
    userId: string,
    chargerId: string,
    connectorId = 1,
    chargeBoxIdentity?: string,
  ) {
    try {
      // If chargeBoxIdentity is given (from mobile app), resolve to OCPP service UUID
      let resolvedChargerId = chargerId;
      if (chargeBoxIdentity && !chargerId) {
        const ocppCharger = await this.getChargerByIdentity(chargeBoxIdentity);
        resolvedChargerId = ocppCharger.id;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/sessions`,
          {
            userId,
            chargerId: resolvedChargerId,
            connectorId,
            idTag: `USER-${userId}`,
          },
          { headers: this.getHeaders() },
        ),
      );
      this.logger.log(
        `Session created for user ${userId} on charger ${resolvedChargerId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to create session", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to create session",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async startCharging(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/sessions/start`,
          { sessionId },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(`Charging started for session ${sessionId}`);
      return response.data;
    } catch (error) {
      this.logger.error("Failed to start charging", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to start charging",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async stopCharging(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/sessions/stop`,
          { sessionId },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(`Charging stopped for session ${sessionId}`);
      return response.data;
    } catch (error) {
      this.logger.error("Failed to stop charging", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to stop charging",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSessionDetails(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/sessions/${sessionId}`,
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch session ${sessionId}`, error.message);
      throw new HttpException("Session not found", HttpStatus.NOT_FOUND);
    }
  }

  async getUserSessions(
    userId: string,
    status?: string,
    limit = 20,
    offset = 0,
  ) {
    try {
      const params: any = { limit, offset };
      if (status) params.status = status;

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/users/${userId}/sessions`,
          {
            headers: this.getHeaders(),
            params,
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch sessions for user ${userId}`,
        error.message,
      );
      throw new HttpException(
        "Failed to fetch sessions",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMeterValues(sessionId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/sessions/${sessionId}/meter-values`,
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch meter values for session ${sessionId}`,
        error.message,
      );
      throw new HttpException(
        "Failed to fetch meter values",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async unlockConnector(chargerId: string, connectorId = 1) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/chargers/${chargerId}/unlock`,
          { connectorId },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(
        `Unlock command sent to charger ${chargerId}, connector ${connectorId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to unlock connector", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to unlock connector",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setChargingLimit(
    chargerId: string,
    connectorId: number,
    powerLimitW: number,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/chargers/${chargerId}/set-limit`,
          { connectorId, powerLimitW },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(
        `Charging limit set for charger ${chargerId}: ${powerLimitW}W`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to set charging limit", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to set charging limit",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setAvailability(
    chargerId: string,
    connectorId: number,
    type: "Operative" | "Inoperative",
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/chargers/${chargerId}/availability`,
          { connectorId, type },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(
        `Availability changed for charger ${chargerId} to ${type}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to set availability", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to set availability",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetCharger(chargerId: string, type: "Soft" | "Hard" = "Soft") {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/chargers/${chargerId}/reset`,
          { type },
          { headers: this.getHeaders() },
        ),
      );
      this.logger.log(`Reset (${type}) sent to charger ${chargerId}`);
      return response.data;
    } catch (error) {
      this.logger.error("Failed to reset charger", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to reset charger",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllSessions(status?: string) {
    try {
      const params = status ? `?status=${status}` : "";
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/sessions${params}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to get sessions", error.message);
      throw new HttpException(
        error.response?.data?.error || "Failed to get sessions",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async forceStopSession(sessionId: string) {
    return this.stopCharging(sessionId);
  }

  // OCPP Webhook Handlers
  async handleSessionStartedWebhook(payload: any) {
    try {
      const { sessionId, userId, chargerId, chargerName, connectorId } =
        payload;

      this.logger.log(
        `Session started webhook: ${sessionId} for user ${userId}`,
      );

      // Send notification to user
      await this.notificationsService.sendChargingStarted(
        userId,
        sessionId,
        chargerName || chargerId,
        connectorId || 1,
      );

      return { success: true, message: "Session started notification sent" };
    } catch (error) {
      this.logger.error(
        "Failed to handle session started webhook",
        error.message,
      );
      return { success: false, error: error.message };
    }
  }

  async handleMeterValuesWebhook(payload: any) {
    try {
      const { sessionId, userId, chargerName, meterValues, targetKwh } =
        payload;

      this.logger.log(
        `Meter values webhook: ${sessionId}, values: ${JSON.stringify(meterValues)}`,
      );

      // Check if charging reached 80%
      const energyDelivered = meterValues?.energyActiveImportRegister || 0;
      const target = targetKwh || 100; // Default target if not provided
      const percentage = (energyDelivered / target) * 100;

      if (percentage >= 80 && percentage < 85) {
        // Send 80% notification (using narrow window to avoid duplicates)
        await this.notificationsService.sendCharging80Percent(
          userId,
          chargerName,
          chargerName,
          sessionId,
        );
        this.logger.log(`80% notification sent for session ${sessionId}`);
      }

      return { success: true, message: "Meter values processed", percentage };
    } catch (error) {
      this.logger.error("Failed to handle meter values webhook", error.message);
      return { success: false, error: error.message };
    }
  }

  async handleSessionCompletedWebhook(payload: any) {
    try {
      const {
        sessionId,
        userId,
        chargerName,
        energyDelivered,
        duration,
        cost,
      } = payload;

      this.logger.log(
        `Session completed webhook: ${sessionId} for user ${userId}`,
      );

      // Send notification to user
      await this.notificationsService.sendChargingCompleted(
        userId,
        chargerName,
        chargerName,
        sessionId,
      );

      return { success: true, message: "Session completed notification sent" };
    } catch (error) {
      this.logger.error(
        "Failed to handle session completed webhook",
        error.message,
      );
      return { success: false, error: error.message };
    }
  }
}
