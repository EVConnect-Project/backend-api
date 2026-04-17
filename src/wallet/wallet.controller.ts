import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StartChargingDto } from './dto/start-charging.dto';
import { StopChargingDto } from './dto/stop-charging.dto';
import { WalletTopupDto } from './dto/wallet-topup.dto';
import { ChargingSessionStatus } from './entities/charging-session.entity';
import { WalletService } from './wallet.service';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getWallet(@Request() req) {
    return this.walletService.getWallet(req.user.userId);
  }

  @Post('wallet/topup')
  @UseGuards(JwtAuthGuard)
  createWalletTopup(
    @Request() req,
    @Body(ValidationPipe) dto: WalletTopupDto,
  ) {
    return this.walletService.createTopup(req.user.userId, dto);
  }

  @Post('wallet/topup/confirm')
  @UseGuards(JwtAuthGuard)
  confirmWalletTopup(
    @Request() req,
    @Body() payload: Record<string, any>,
  ) {
    return this.walletService.confirmTopupFromReturn(req.user.userId, payload);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.walletService.listTransactions(
      req.user.userId,
      this.parsePositiveInt(limit, 50),
      this.parsePositiveInt(offset, 0),
    );
  }

  @Get('charging/sessions')
  @UseGuards(JwtAuthGuard)
  getChargingSessions(
    @Request() req,
    @Query('status') status?: ChargingSessionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.walletService.listSessions(
      req.user.userId,
      status,
      this.parsePositiveInt(limit, 50),
      this.parsePositiveInt(offset, 0),
    );
  }

  @Post('charging/start')
  @UseGuards(JwtAuthGuard)
  startCharging(
    @Request() req,
    @Body(ValidationPipe) dto: StartChargingDto,
  ) {
    return this.walletService.startCharging(req.user.userId, dto);
  }

  @Post('charging/stop')
  @UseGuards(JwtAuthGuard)
  stopCharging(
    @Request() req,
    @Body(ValidationPipe) dto: StopChargingDto,
  ) {
    return this.walletService.stopCharging(req.user.userId, dto);
  }

  @Post('payment/webhook')
  @HttpCode(HttpStatus.OK)
  handlePayhereWebhook(@Body() payload: Record<string, any>) {
    return this.walletService.handlePayhereWebhook(payload);
  }
}
