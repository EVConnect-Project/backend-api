import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChargingService } from './charging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';

@Controller('charging')
@UseGuards(JwtAuthGuard)
export class ChargingController {
  constructor(private readonly chargingService: ChargingService) {}

  @Get('chargers')
  async getAvailableChargers() {
    return this.chargingService.getAvailableChargers();
  }

  @Get('chargers/connected')
  async getConnectedChargers() {
    return this.chargingService.getConnectedChargers();
  }

  @Get('chargers/:id')
  async getChargerDetails(@Param('id') chargerId: string) {
    return this.chargingService.getChargerDetails(chargerId);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Request() req,
    @Body('chargerId') chargerId: string,
    @Body('connectorId') connectorId?: number,
  ) {
    const userId = req.user.userId;
    return this.chargingService.createSession(userId, chargerId, connectorId);
  }

  @Post('sessions/:id/start')
  async startCharging(@Param('id') sessionId: string, @Request() req) {
    // Optional: Verify user owns this session
    const session = await this.chargingService.getSessionDetails(sessionId);
    if (session.userId !== req.user.userId) {
      throw new Error('Unauthorized');
    }
    return this.chargingService.startCharging(sessionId);
  }

  @Post('sessions/:id/stop')
  async stopCharging(@Param('id') sessionId: string, @Request() req) {
    // Optional: Verify user owns this session
    const session = await this.chargingService.getSessionDetails(sessionId);
    if (session.userId !== req.user.userId) {
      throw new Error('Unauthorized');
    }
    return this.chargingService.stopCharging(sessionId);
  }

  @Get('sessions/:id')
  async getSessionDetails(@Param('id') sessionId: string, @Request() req) {
    const session = await this.chargingService.getSessionDetails(sessionId);
    if (session.userId !== req.user.userId) {
      throw new Error('Unauthorized');
    }
    return session;
  }

  @Get('my-sessions')
  async getMySessions(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user.userId;
    return this.chargingService.getUserSessions(userId, status, limit, offset);
  }

  @Get('sessions/:id/meter-values')
  async getMeterValues(@Param('id') sessionId: string, @Request() req) {
    const session = await this.chargingService.getSessionDetails(sessionId);
    if (session.userId !== req.user.userId) {
      throw new Error('Unauthorized');
    }
    return this.chargingService.getMeterValues(sessionId);
  }

  @Post('chargers/:id/unlock')
  async unlockConnector(
    @Param('id') chargerId: string,
    @Body('connectorId') connectorId?: number,
  ) {
    return this.chargingService.unlockConnector(chargerId, connectorId);
  }

  @Post('chargers/:id/set-limit')
  async setChargingLimit(
    @Param('id') chargerId: string,
    @Body('connectorId') connectorId: number,
    @Body('powerLimitW') powerLimitW: number,
  ) {
    return this.chargingService.setChargingLimit(chargerId, connectorId, powerLimitW);
  }

  @Post('chargers/:id/availability')
  async setAvailability(
    @Param('id') chargerId: string,
    @Body('connectorId') connectorId: number,
    @Body('type') type: 'Operative' | 'Inoperative',
  ) {
    return this.chargingService.setAvailability(chargerId, connectorId, type);
  }

  // OCPP Webhooks - API key authenticated endpoints for ev-charging-service callbacks
  @Post('webhooks/session-started')
  @UseGuards(WebhookAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleSessionStarted(@Body() payload: any) {
    return this.chargingService.handleSessionStartedWebhook(payload);
  }

  @Post('webhooks/meter-values')
  @UseGuards(WebhookAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleMeterValues(@Body() payload: any) {
    return this.chargingService.handleMeterValuesWebhook(payload);
  }

  @Post('webhooks/session-completed')
  @UseGuards(WebhookAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleSessionCompleted(@Body() payload: any) {
    return this.chargingService.handleSessionCompletedWebhook(payload);
  }
}
