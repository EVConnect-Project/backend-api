import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PaymentEntity } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentMethodsService } from './payment-methods.service';
import { ConfirmCardSetupDto } from './dto/confirm-card-setup.dto';
import { PaymentMethodType } from './entities/payment-method.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import {
  WalletTransactionEntity,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../wallet/entities/wallet-transaction.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
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
    @InjectRepository(WalletEntity)
    private walletRepository: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private walletTransactionRepository: Repository<WalletTransactionEntity>,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private paymentMethodsService: PaymentMethodsService,
  ) {
    this.payhereBaseUrl =
      (this.configService.get<string>('PAYHERE_BASE_URL') || 'https://sandbox.payhere.lk').trim();
    this.payhereMerchantId =
      (this.configService.get<string>('PAYHERE_MERCHANT_ID') || 'MERCHANT_ID').trim();
    this.payhereMerchantSecret =
      (this.configService.get<string>('PAYHERE_MERCHANT_SECRET') || 'MERCHANT_SECRET').trim();
    this.payhereNotifyUrl =
      (this.configService.get<string>('PAYHERE_NOTIFY_URL') || 'http://localhost:4000/api/payments/webhook').trim();
    this.payhereReturnUrl =
      (this.configService.get<string>('PAYHERE_RETURN_URL') || 'http://localhost:3000/payment/success').trim();
    this.payhereCancelUrl =
      (this.configService.get<string>('PAYHERE_CANCEL_URL') || 'http://localhost:3000/payment/cancel').trim();
  }

  private toMoney(value: number | string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Number(parsed.toFixed(2));
  }

  private generateCardSetupSignature(
    setupId: string,
    userId: string,
    expiresAt: number,
  ): string {
    const payload = `${setupId}:${userId}:${expiresAt}:${this.payhereMerchantSecret}`;
    return createHash('md5').update(payload).digest('hex').toUpperCase();
  }

  async createCardSetupIntent(userId: string): Promise<{
    setupId: string;
    expiresAt: number;
    signature: string;
    provider: 'payhere';
    hostedUrl: string | null;
    callbackUrl: string;
  }> {
    const setupId = randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const signature = this.generateCardSetupSignature(setupId, userId, expiresAt);
    const callbackUrl =
      this.configService.get<string>('MOBILE_CARD_SETUP_CALLBACK_URL') ||
      'evconnect://wallet/card-setup';

    const hostedSetupBaseUrl = this.configService.get<string>('PAYHERE_CARD_SETUP_URL');
    let hostedUrl: string | null = null;
    if (hostedSetupBaseUrl) {
      const params = new URLSearchParams({
        setupId,
        expiresAt: String(expiresAt),
        signature,
        callbackUrl,
      });
      hostedUrl = `${hostedSetupBaseUrl}?${params.toString()}`;
    }

    return {
      setupId,
      expiresAt,
      signature,
      provider: 'payhere',
      hostedUrl,
      callbackUrl,
    };
  }

  async confirmCardSetup(
    userId: string,
    dto: ConfirmCardSetupDto,
  ) {
    const now = Date.now();
    if (dto.expiresAt <= now) {
      throw new BadRequestException('Card setup session expired');
    }

    const expected = this.generateCardSetupSignature(dto.setupId, userId, dto.expiresAt);
    if (expected !== dto.signature) {
      throw new BadRequestException('Invalid card setup signature');
    }

    return this.paymentMethodsService.create(
      {
        type: PaymentMethodType.CARD,
        cardBrand: dto.cardBrand,
        lastFour: dto.lastFour,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        cardholderName: dto.cardholderName,
        token: dto.token,
        isDefault: dto.isDefault,
      },
      userId,
    );
  }

  private generatePayHereHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
  ): string {
    const amountFormatted = Number(amount).toFixed(2);
    const currencyCode = currency.toUpperCase();
    const merchantSecretHash = createHash('md5')
      .update(this.payhereMerchantSecret)
      .digest('hex')
      .toUpperCase();

    const hash = createHash('md5')
      .update(`${merchantId}${orderId}${amountFormatted}${currencyCode}${merchantSecretHash}`)
      .digest('hex')
      .toUpperCase();
    return hash;
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, userId: string): Promise<any> {
    const { bookingId, amount, paymentMethod } = createPaymentDto;
    const normalizedMethod = (paymentMethod || 'payhere').toLowerCase();

    try {

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

    if (booking.userId !== userId) {
      throw new BadRequestException('Cannot create payment for another user booking');
    }

    if ((booking.paymentStatus || '').toLowerCase() === 'success') {
      throw new BadRequestException('Booking payment is already completed');
    }

    // Calculate commission: 6% system fee, 94% owner revenue
    const systemCommission = Number((amount * 0.06).toFixed(2));
    const ownerRevenue = Number((amount * 0.94).toFixed(2));

      const payment = this.paymentRepository.create({
        bookingId,
        amount,
        systemCommission,
        ownerRevenue,
        status: 'pending',
        paymentMethod: normalizedMethod,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      if (normalizedMethod == 'wallet') {
      let walletResult: {
        transactionId: string;
        availableBalance: number;
        currency: string;
      };

      try {
        walletResult = await this.paymentRepository.manager.transaction(async (manager) => {
          const walletRepo = manager.getRepository(WalletEntity);
          const walletTransactionRepo = manager.getRepository(WalletTransactionEntity);
          const paymentRepo = manager.getRepository(PaymentEntity);
          const bookingRepo = manager.getRepository(BookingEntity);

          const wallet = await walletRepo.findOne({ where: { userId } });
          if (!wallet) {
            throw new BadRequestException('Wallet not found. Please top up your wallet first.');
          }

          const balance = this.toMoney(wallet.balance);
          const held = this.toMoney(wallet.heldBalance || 0);
          const available = this.toMoney(balance - held);
          const payAmount = this.toMoney(amount);

          if (available < payAmount) {
            throw new BadRequestException(
              `Insufficient wallet balance. Available: LKR ${available.toFixed(2)}`,
            );
          }

          wallet.balance = this.toMoney(balance - payAmount);
          await walletRepo.save(wallet);

          const walletTx = walletTransactionRepo.create({
            userId,
            type: WalletTransactionType.PAYMENT,
            amount: payAmount,
            status: WalletTransactionStatus.SUCCESS,
            referenceId: savedPayment.id,
            metadata: {
              bookingId,
              source: 'booking_wallet_payment',
            },
          });

          const savedWalletTx = await walletTransactionRepo.save(walletTx);

          await paymentRepo.update(savedPayment.id, {
            status: 'succeeded',
            txnId: savedWalletTx.transactionId,
          });

          await bookingRepo.update(bookingId, {
            status: booking.status === 'pending' ? 'confirmed' : booking.status,
            paymentStatus: 'success',
          });

          return {
            transactionId: savedWalletTx.transactionId,
            availableBalance: this.toMoney(wallet.balance - (wallet.heldBalance || 0)),
            currency: wallet.currency || 'LKR',
          };
        });
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        this.logger.error('Wallet payment transaction failed', error as Error);
        throw new BadRequestException('Unable to process wallet payment at the moment.');
      }

      // Notification delivery should never fail a successful payment.
      try {
        await this.notificationsService.sendPaymentSuccess(userId, amount, savedPayment.id);
      } catch (notificationError) {
        this.logger.warn(
          `Payment success notification failed for payment ${savedPayment.id}: ${String(notificationError)}`,
        );
      }

        return {
          id: savedPayment.id,
          status: 'succeeded',
          amount: savedPayment.amount,
          paymentMethod: 'wallet',
          transactionId: walletResult.transactionId,
          wallet: {
            availableBalance: walletResult.availableBalance,
            currency: walletResult.currency,
          },
        };
      }

      try {
        const orderId = savedPayment.id;
        const currency = 'LKR';
        const amountStr = Number(amount).toFixed(2);

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
          email: 'customer@evconnect.lk', // Default email for PayHere
          phone: booking.user?.phoneNumber || '0771234567',
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
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Unexpected payment intent error for booking ${bookingId}: ${String(error)}`,
      );
      throw new BadRequestException('Unable to process payment at the moment. Please try again.');
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

      const merchantSecretHash = createHash('md5')
        .update(this.payhereMerchantSecret)
        .digest('hex')
        .toUpperCase();

      const localHash = createHash('md5')
        .update(
          `${merchant_id}${order_id}${payhere_amount}${String(payhere_currency).toUpperCase()}${status_code}${merchantSecretHash}`,
        )
        .digest('hex')
        .toUpperCase();

      const incoming = Buffer.from(String(md5sig).toUpperCase());
      const expected = Buffer.from(localHash);

      if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) {
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

  async findUserTransactions(userId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: PaymentEntity[]; total: number }> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('booking.charger', 'charger')
      .where('booking.userId = :userId', { userId });

    if (filters?.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere('payment.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('payment.createdAt <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('payment.createdAt', 'DESC');

    const total = await query.getCount();

    if (filters?.limit) {
      query.take(filters.limit);
    }

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const transactions = await query.getMany();

    return { transactions, total };
  }
}
