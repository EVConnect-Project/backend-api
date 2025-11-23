import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChargingService {
  private readonly logger = new Logger(ChargingService.name);
  private readonly chargingServiceUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.chargingServiceUrl = this.configService.get<string>(
      'CHARGING_SERVICE_URL',
      'http://localhost:4000',
    );
    this.apiKey = this.configService.get<string>(
      'CHARGING_SERVICE_API_KEY',
      'evconnect-backend-api-key-dev',
    );
  }

  private getHeaders() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getAvailableChargers() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/chargers`, {
          headers: this.getHeaders(),
          params: { isOnline: true, status: 'Available' },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch available chargers', error.message);
      throw new HttpException(
        'Failed to fetch chargers',
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
      this.logger.error('Failed to fetch connected chargers', error.message);
      throw new HttpException(
        'Failed to fetch chargers',
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
      throw new HttpException(
        'Charger not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async createSession(userId: string, chargerId: string, connectorId = 1) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.chargingServiceUrl}/sessions`,
          {
            userId,
            chargerId,
            connectorId,
            idTag: `USER-${userId}`,
          },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(`Session created for user ${userId} on charger ${chargerId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create session', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to create session',
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
      this.logger.error('Failed to start charging', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to start charging',
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
      this.logger.error('Failed to stop charging', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to stop charging',
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
      throw new HttpException(
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getUserSessions(userId: string, status?: string, limit = 20, offset = 0) {
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
      this.logger.error(`Failed to fetch sessions for user ${userId}`, error.message);
      throw new HttpException(
        'Failed to fetch sessions',
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
      this.logger.error(`Failed to fetch meter values for session ${sessionId}`, error.message);
      throw new HttpException(
        'Failed to fetch meter values',
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
      this.logger.log(`Unlock command sent to charger ${chargerId}, connector ${connectorId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to unlock connector', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to unlock connector',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setChargingLimit(chargerId: string, connectorId: number, powerLimitW: number) {
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
      this.logger.log(`Charging limit set for charger ${chargerId}: ${powerLimitW}W`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to set charging limit', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to set charging limit',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setAvailability(chargerId: string, connectorId: number, type: 'Operative' | 'Inoperative') {
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
      this.logger.log(`Availability changed for charger ${chargerId} to ${type}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to set availability', error.message);
      throw new HttpException(
        error.response?.data?.error || 'Failed to set availability',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
