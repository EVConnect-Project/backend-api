import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  Headers,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.findByBooking(bookingId);
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
}
