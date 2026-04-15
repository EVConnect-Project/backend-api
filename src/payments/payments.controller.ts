import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  Headers,
  Req,
  Patch,
  Put,
  Delete,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentSettingsService } from './payment-settings.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { ConfirmCardSetupDto } from './dto/confirm-card-setup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createPaymentIntent(
    @Body(ValidationPipe) createPaymentDto: CreatePaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.createPaymentIntent(createPaymentDto, req.user.userId);
  }

  @Post('webhook')
  handleWebhook(
    @Body() payload: any,
  ) {
    // PayHere sends webhook data as form-urlencoded
    return this.paymentsService.handleWebhook(payload);
  }

  // Payment Methods endpoints - MUST come before :id routes to avoid route conflicts
  @Post('methods')
  @UseGuards(JwtAuthGuard)
  createPaymentMethod(
    @Body(ValidationPipe) createDto: CreatePaymentMethodDto,
    @Request() req,
  ) {
    return this.paymentMethodsService.create(createDto, req.user.userId);
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  findAllPaymentMethods(@Request() req) {
    return this.paymentMethodsService.findAll(req.user.userId);
  }

  @Get('methods/default')
  @UseGuards(JwtAuthGuard)
  findDefaultPaymentMethod(@Request() req) {
    return this.paymentMethodsService.findDefault(req.user.userId);
  }

  @Post('methods/setup-intent')
  @UseGuards(JwtAuthGuard)
  createCardSetupIntent(@Request() req) {
    return this.paymentsService.createCardSetupIntent(req.user.userId);
  }

  @Post('methods/confirm')
  @UseGuards(JwtAuthGuard)
  confirmCardSetup(
    @Body(ValidationPipe) dto: ConfirmCardSetupDto,
    @Request() req,
  ) {
    return this.paymentsService.confirmCardSetup(req.user.userId, dto);
  }

  @Get('methods/:id')
  @UseGuards(JwtAuthGuard)
  findOnePaymentMethod(@Param('id') id: string, @Request() req) {
    return this.paymentMethodsService.findOne(id, req.user.userId);
  }

  @Patch('methods/:id')
  @UseGuards(JwtAuthGuard)
  updatePaymentMethod(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdatePaymentMethodDto,
    @Request() req,
  ) {
    return this.paymentMethodsService.update(id, updateDto, req.user.userId);
  }

  @Post('methods/:id/default')
  @UseGuards(JwtAuthGuard)
  setDefaultPaymentMethod(@Param('id') id: string, @Request() req) {
    return this.paymentMethodsService.setDefault(id, req.user.userId);
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard)
  removePaymentMethod(@Param('id') id: string, @Request() req) {
    return this.paymentMethodsService.remove(id, req.user.userId);
  }

  // Payment Settings endpoints
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getPaymentSettings(@Request() req) {
    return this.paymentSettingsService.findOrCreate(req.user.userId);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  updatePaymentSettings(
    @Body(ValidationPipe) updateDto: UpdatePaymentSettingsDto,
    @Request() req,
  ) {
    return this.paymentSettingsService.update(req.user.userId, updateDto);
  }

  @Post('settings/pin')
  @UseGuards(JwtAuthGuard)
  setPaymentPin(@Body('pin') pin: string, @Request() req) {
    return this.paymentSettingsService.setPaymentPin(req.user.userId, pin);
  }

  @Post('settings/verify-pin')
  @UseGuards(JwtAuthGuard)
  verifyPaymentPin(@Body('pin') pin: string, @Request() req) {
    return this.paymentSettingsService.verifyPaymentPin(req.user.userId, pin);
  }

  @Put('settings/pin')
  @UseGuards(JwtAuthGuard)
  changePaymentPin(
    @Body() { oldPin, newPin }: { oldPin: string; newPin: string },
    @Request() req,
  ) {
    return this.paymentSettingsService.changePaymentPin(req.user.userId, oldPin, newPin);
  }

  @Get('settings/pin-status')
  @UseGuards(JwtAuthGuard)
  getPinStatus(@Request() req) {
    return this.paymentSettingsService.getPinStatus(req.user.userId);
  }

  @Delete('settings/pin')
  @UseGuards(JwtAuthGuard)
  removePaymentPin(@Request() req) {
    return this.paymentSettingsService.removePaymentPin(req.user.userId);
  }

  // Specific payment transaction routes - MUST come before generic :id route
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Get('user/transactions')
  @UseGuards(JwtAuthGuard)
  getUserTransactions(
    @Request() req,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };
    return this.paymentsService.findUserTransactions(req.user.userId, filters);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  refundPayment(@Param('id') id: string) {
    return this.paymentsService.refundPayment(id);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirmPayment(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  // Generic payment routes - MUST come LAST to avoid catching specific routes
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  // Duplicate Payment Methods endpoints removed - already defined above
}
