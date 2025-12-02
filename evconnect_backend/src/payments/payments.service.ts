import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PaymentEntity } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private payhereBaseUrl: string;
  private payhereMerchantId: string;
  private payhereMerchantSecret: string;
  private payhereNotifyUrl: string;
  private payhereReturnUrl: string;
  private payhereCancelUrl: string;

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.payhereBaseUrl = this.configService.get<string>('PAYHERE_BASE_URL') || 'https://sandbox.payhere.lk';
    this.payhereMerchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID') || 'MERCHANT_ID';
    this.payhereMerchantSecret = this.configService.get<string>('PAYHERE_MERCHANT_SECRET') || 'MERCHANT_SECRET';
    this.payhereNotifyUrl = this.configService.get<string>('PAYHERE_NOTIFY_URL') || 'http://localhost:4000/api/payments/webhook';
    this.payhereReturnUrl = this.configService.get<string>('PAYHERE_RETURN_URL') || 'http://localhost:3000/payment/success';
    this.payhereCancelUrl = this.configService.get<string>('PAYHERE_CANCEL_URL') || 'http://localhost:3000/payment/cancel';
  }

  private generatePayHereHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
  ): string {
    const amountFormatted = parseFloat(amount).toFixed(2);
    const hashString = `${merchantId}${orderId}${amountFormatted}${currency}`;
    const hash = createHash('md5')
      .update(hashString + this.payhereMerchantSecret)
      .digest('hex')
      .toUpperCase();
    return hash;
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, userId: string): Promise<any> {
    const { bookingId, amount, paymentMethod } = createPaymentDto;

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user', 'charger'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const payment = this.paymentRepository.create({
      bookingId,
      amount,
      status: 'pending',
      paymentMethod: paymentMethod || 'payhere',
    });

    const savedPayment = await this.paymentRepository.save(payment);

    try {
      const orderId = savedPayment.id;
      const currency = 'LKR';
      const amountStr = amount.toString();

      const hash = this.generatePayHereHash(
        this.payhereMerchantId,
        orderId,
        amountStr,
        currency,
      );

      const payhereData = {
        merchant_id: this.payhereMerchantId,
        return_url: this.payhereReturnUrl,
        cancel_url: this.payhereCancelUrl,
        notify_url: this.payhereNotifyUrl,
        order_id: orderId,
        items: `EV Charger Booking - ${bookingId.substring(0, 8)}`,
        currency: currency,
        amount: amountStr,
        first_name: booking.user?.name?.split(' ')[0] || 'Customer',
        last_name: booking.user?.name?.split(' ').slice(1).join(' ') || '',
        email: booking.user?.email || 'customer@evconnect.lk',
        phone: '0771234567',
        address: booking.charger?.address || 'Colombo',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash: hash,
        custom_1: bookingId,
        custom_2: userId,
      };

      return {
        id: savedPayment.id,
        status: savedPayment.status,
        amount: savedPayment.amount,
        checkoutData: payhereData,
        checkoutUrl: `${this.payhereBaseUrl}/pay/checkout`,
      };
    } catch (error) {
      await this.paymentRepository.update(savedPayment.id, { status: 'failed' });
      throw new BadRequestException(`Payment creation failed: ${error.message}`);
    }
  }

  async handleWebhook(payload: any): Promise<any> {
    try {
      const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig,
        payment_id,
      } = payload;

      const merchantSecret = this.payhereMerchantSecret;
      const localHash = createHash('md5')
        .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + merchantSecret)
        .digest('hex')
        .toUpperCase();

      if (localHash !== md5sig) {
        console.error('PayHere hash verification failed');
        throw new BadRequestException('Invalid webhook signature');
      }

      const payment = await this.paymentRepository.findOne({
        where: { id: order_id },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      switch (parseInt(status_code)) {
        case 2:
          await this.handlePaymentSuccess(payment, payment_id);
          break;
        case 0:
          await this.paymentRepository.update(payment.id, {
            status: 'processing',
            txnId: payment_id,
          });
          break;
        case -1:
        case -2:
        case -3:
          await this.handlePaymentFailure(payment, status_code);
          break;
        default:
          console.warn(`Unknown PayHere status code: ${status_code}`);
      }

      return { received: true };
    } catch (error) {
      console.error('PayHere webhook error:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(payment: PaymentEntity, transactionId: string): Promise<void> {
    await this.paymentRepository.update(payment.id, {
      status: 'succeeded',
      txnId: transactionId,
    });

    const booking = await this.bookingRepository.findOne({
      where: { id: payment.bookingId },
    });

    if (booking && booking.status === 'pending') {
      await this.bookingRepository.update(booking.id, {
        status: 'confirmed',
      });
    }

    // Send payment success notification
    if (booking) {
      await this.notificationsService.sendPaymentSuccess(
        booking.userId,
        payment.amount,
        payment.id,
      );
    }

    console.log(`Payment ${payment.id} succeeded. Booking ${payment.bookingId} confirmed.`);
  }

  private async handlePaymentFailure(payment: PaymentEntity, statusCode: string): Promise<void> {
    await this.paymentRepository.update(payment.id, {
      status: 'failed',
      metadata: JSON.stringify({ payhereStatusCode: statusCode }),
    });

    // Get booking to access userId
    const booking = await this.bookingRepository.findOne({
      where: { id: payment.bookingId },
    });

    // Send payment failed notification
    if (booking) {
      await this.notificationsService.sendPaymentFailed(
        booking.userId,
        payment.amount,
        payment.id,
      );
    }

    console.log(`Payment ${payment.id} failed with status code: ${statusCode}`);
  }

  async confirmPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findAll(): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      relations: ['booking'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['booking'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByBooking(bookingId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Only succeeded payments can be refunded');
    }

    await this.paymentRepository.update(paymentId, {
      status: 'refunded',
      metadata: JSON.stringify({
        refundRequestedAt: new Date().toISOString(),
        note: 'Refund needs to be processed manually via PayHere dashboard',
      }),
    });

    return this.findOne(paymentId);
  }
}
