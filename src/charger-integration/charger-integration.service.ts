import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from '../charger/entities/charger.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class ChargerIntegrationService {
  private readonly logger = new Logger(ChargerIntegrationService.name);
  private readonly chargingServiceUrl = 'http://localhost:4000';
  private readonly apiKey = process.env.CHARGING_SERVICE_API_KEY || 'evconnect-backend-api-key-dev';

  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generate OCPP credentials for a newly registered charger
   * Called after charger registration
   */
  async generateOcppCredentials(chargerId: string): Promise<{
    chargeBoxIdentity: string;
    setupInstructions: string;
    wsUrl: string;
  }> {
    const charger = await this.chargerRepository.findOne({
      where: { id: chargerId },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (charger.chargeBoxIdentity) {
      this.logger.warn(`Charger ${chargerId} already has OCPP credentials`);
      return {
        chargeBoxIdentity: charger.chargeBoxIdentity,
        setupInstructions: this.generateSetupInstructions(charger.chargeBoxIdentity),
        wsUrl: `ws://192.168.2.1:4000/ocpp`,
      };
    }

    // Generate unique chargeBoxIdentity
    const prefix = 'EVCONNECT-CHG';
    const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
    const chargeBoxIdentity = `${prefix}-${randomId}`;

    // Update charger with OCPP credentials
    charger.chargeBoxIdentity = chargeBoxIdentity;
    charger.ocppStatus = 'pending';
    await this.chargerRepository.save(charger);

    this.logger.log(`Generated OCPP credentials for charger ${chargerId}: ${chargeBoxIdentity}`);

    return {
      chargeBoxIdentity,
      setupInstructions: this.generateSetupInstructions(chargeBoxIdentity),
      wsUrl: `ws://192.168.2.1:4000/ocpp`,
    };
  }

  /**
   * Link OCPP charger to registered charger when it connects
   * Called by charging service via webhook or polling
   */
  async linkOcppCharger(chargeBoxIdentity: string, ocppChargerId: string): Promise<void> {
    const charger = await this.chargerRepository.findOne({
      where: { chargeBoxIdentity },
    });

    if (!charger) {
      this.logger.warn(`No registered charger found for ${chargeBoxIdentity}`);
      return;
    }

    try {
      // Update OCPP charger with owner and pricing info
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.chargingServiceUrl}/chargers/${ocppChargerId}`,
          {
            ownerId: charger.ownerId,
            registryId: charger.id,
            pricePerKwh: parseFloat(charger.pricePerKwh.toString()),
            latitude: parseFloat(charger.lat.toString()),
            longitude: parseFloat(charger.lng.toString()),
          },
          {
            headers: { 'X-API-Key': this.apiKey },
          },
        ),
      );

      // Update registration record
      charger.ocppStatus = 'connected';
      charger.isOnline = true;
      await this.chargerRepository.save(charger);

      this.logger.log(`Linked OCPP charger ${chargeBoxIdentity} to registry ${charger.id}`);
    } catch (error) {
      this.logger.error(`Failed to link OCPP charger: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync OCPP charger status to registration system
   * Called periodically or on status change
   */
  async syncChargerStatus(chargeBoxIdentity: string): Promise<void> {
    const charger = await this.chargerRepository.findOne({
      where: { chargeBoxIdentity },
    });

    if (!charger) {
      return;
    }

    try {
      // Get OCPP charger status
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.chargingServiceUrl}/chargers/by-identity/${chargeBoxIdentity}`,
          {
            headers: { 'X-API-Key': this.apiKey },
          },
        ),
      );

      const ocppCharger = response.data;

      // Update registration record
      charger.isOnline = ocppCharger.isOnline;
      if (ocppCharger.lastHeartbeat) {
        charger.lastHeartbeat = new Date(ocppCharger.lastHeartbeat);
      } else {
        charger.lastHeartbeat = null;
      }
      charger.ocppStatus = ocppCharger.isOnline ? 'connected' : 'configured';
      
      // Update availability status
      if (ocppCharger.status === 'Charging' || ocppCharger.status === 'Preparing') {
        charger.status = 'in-use';
      } else if (ocppCharger.isOnline) {
        charger.status = 'available';
      } else {
        charger.status = 'offline';
      }

      await this.chargerRepository.save(charger);

      this.logger.debug(`Synced status for charger ${chargeBoxIdentity}`);
    } catch (error) {
      this.logger.error(`Failed to sync charger status: ${error.message}`);
    }
  }

  /**
   * Calculate and distribute revenue when charging session completes
   */
  async distributeSessionRevenue(sessionId: string): Promise<{
    ownerEarnings: number;
    platformEarnings: number;
  }> {
    try {
      // Get session details from charging service
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/sessions/${sessionId}`, {
          headers: { 'X-API-Key': this.apiKey },
        }),
      );

      const session = response.data;

      if (!session.totalCost || session.totalCost === 0) {
        this.logger.warn(`Session ${sessionId} has no cost to distribute`);
        return { ownerEarnings: 0, platformEarnings: 0 };
      }

      // Calculate split: 85% owner, 15% platform
      const ownerEarnings = session.totalCost * 0.85;
      const platformEarnings = session.totalCost * 0.15;

      // Update session with earnings
      await firstValueFrom(
        this.httpService.patch(
          `${this.chargingServiceUrl}/sessions/${sessionId}`,
          {
            ownerEarnings,
            platformEarnings,
          },
          {
            headers: { 'X-API-Key': this.apiKey },
          },
        ),
      );

      this.logger.log(
        `Distributed revenue for session ${sessionId}: Owner $${ownerEarnings.toFixed(2)}, Platform $${platformEarnings.toFixed(2)}`,
      );

      return { ownerEarnings, platformEarnings };
    } catch (error) {
      this.logger.error(`Failed to distribute revenue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get charger details with OCPP status for app display
   */
  async getChargerWithOcppStatus(chargerId: string): Promise<any> {
    const charger = await this.chargerRepository.findOne({
      where: { id: chargerId },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    let ocppStatus = null;

    if (charger.chargeBoxIdentity) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.chargingServiceUrl}/chargers/by-identity/${charger.chargeBoxIdentity}`,
            {
              headers: { 'X-API-Key': this.apiKey },
            },
          ),
        );
        ocppStatus = response.data;
      } catch (error) {
        this.logger.warn(`Could not fetch OCPP status for ${charger.chargeBoxIdentity}`);
      }
    }

    return {
      ...charger,
      ocpp: ocppStatus,
      canControl: charger.chargeBoxIdentity && charger.isOnline,
    };
  }

  /**
   * Generate setup instructions for charger owner
   */
  private generateSetupInstructions(chargeBoxIdentity: string): string {
    return `
OCPP Setup Instructions
========================

Your charger has been registered for remote control via OCPP 1.6.

Configuration:
- ChargeBox Identity: ${chargeBoxIdentity}
- WebSocket URL: ws://192.168.2.1:4000/ocpp
- Protocol: OCPP 1.6 JSON

Steps:
1. Access your charger's admin panel
2. Navigate to OCPP configuration
3. Enter the ChargeBox Identity: ${chargeBoxIdentity}
4. Set the Central System URL: ws://192.168.2.1:4000/ocpp
5. Select protocol: OCPP 1.6 JSON
6. Save and restart your charger

Once connected, your charger will appear as "Online" in the app and users can:
- Start/stop charging remotely
- Lock/unlock connectors
- Monitor real-time energy usage
- Make payments per kWh

You will earn 85% of all charging revenue automatically.

Need help? Contact support@evconnect.com
    `.trim();
  }

  /**
   * Get owner's revenue statistics
   */
  async getOwnerRevenue(ownerId: string): Promise<{
    totalEarnings: number;
    sessionCount: number;
    totalEnergyDelivered: number;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.chargingServiceUrl}/owner/${ownerId}/revenue`, {
          headers: { 'X-API-Key': this.apiKey },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get owner revenue: ${error.message}`);
      return {
        totalEarnings: 0,
        sessionCount: 0,
        totalEnergyDelivered: 0,
      };
    }
  }
}
