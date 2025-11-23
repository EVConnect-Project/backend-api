import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ChargerIntegrationService } from './charger-integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('charger-integration')
export class ChargerIntegrationController {
  private readonly logger = new Logger(ChargerIntegrationController.name);

  constructor(private readonly integrationService: ChargerIntegrationService) {}

  /**
   * Generate OCPP credentials for registered charger
   * POST /charger-integration/:chargerId/ocpp-credentials
   */
  @Post(':chargerId/ocpp-credentials')
  @UseGuards(JwtAuthGuard)
  async generateCredentials(@Param('chargerId') chargerId: string, @Request() req) {
    this.logger.log(`User ${req.user.userId} requesting OCPP credentials for charger ${chargerId}`);
    return this.integrationService.generateOcppCredentials(chargerId);
  }

  /**
   * Get charger with OCPP status
   * GET /charger-integration/:chargerId/status
   */
  @Get(':chargerId/status')
  @UseGuards(JwtAuthGuard)
  async getChargerStatus(@Param('chargerId') chargerId: string) {
    return this.integrationService.getChargerWithOcppStatus(chargerId);
  }

  /**
   * Webhook from charging service when charger connects
   * POST /charger-integration/webhook/charger-connected
   */
  @Post('webhook/charger-connected')
  async chargerConnected(
    @Body() body: { chargeBoxIdentity: string; ocppChargerId: string },
  ) {
    this.logger.log(`Charger connected webhook: ${body.chargeBoxIdentity}`);
    await this.integrationService.linkOcppCharger(body.chargeBoxIdentity, body.ocppChargerId);
    return { success: true };
  }

  /**
   * Webhook from charging service when session completes
   * POST /charger-integration/webhook/session-completed
   */
  @Post('webhook/session-completed')
  async sessionCompleted(@Body() body: { sessionId: string }) {
    this.logger.log(`Session completed webhook: ${body.sessionId}`);
    const revenue = await this.integrationService.distributeSessionRevenue(body.sessionId);
    return { success: true, revenue };
  }

  /**
   * Sync charger status from OCPP system
   * PATCH /charger-integration/:chargeBoxIdentity/sync
   */
  @Patch(':chargeBoxIdentity/sync')
  async syncStatus(@Param('chargeBoxIdentity') chargeBoxIdentity: string) {
    await this.integrationService.syncChargerStatus(chargeBoxIdentity);
    return { success: true };
  }

  /**
   * Get owner's revenue statistics
   * GET /charger-integration/owner/revenue
   */
  @Get('owner/revenue')
  @UseGuards(JwtAuthGuard)
  async getOwnerRevenue(@Request() req) {
    return this.integrationService.getOwnerRevenue(req.user.userId);
  }
}
