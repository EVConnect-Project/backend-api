import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { PaymentEntity } from "./entities/payment.entity";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { BookingEntity } from "../bookings/entities/booking.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { SmsService } from "../auth/sms.service";
import { PaymentMethodsService } from "./payment-methods.service";
import { ConfirmCardSetupDto } from "./dto/confirm-card-setup.dto";
import { PaymentMethodType } from "./entities/payment-method.entity";
import { WalletEntity } from "../wallet/entities/wallet.entity";
import {
  WalletTransactionEntity,
  WalletTransactionStatus,
  WalletTransactionType,
} from "../wallet/entities/wallet-transaction.entity";
import { ReceiptsService } from "../receipts/receipts.service";
import { NotificationType } from "../notifications/types/notification-types";

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
    private smsService: SmsService,
    private paymentMethodsService: PaymentMethodsService,
    private readonly dataSource: DataSource,
    private readonly receiptsService: ReceiptsService,
  ) {
    this.payhereBaseUrl = (
      this.configService.get<string>("PAYHERE_BASE_URL") ||
      "https://sandbox.payhere.lk"
    ).trim();
    this.payhereMerchantId = (
      this.configService.get<string>("PAYHERE_MERCHANT_ID") || "MERCHANT_ID"
    ).trim();
    this.payhereMerchantSecret = (
      this.configService.get<string>("PAYHERE_MERCHANT_SECRET") ||
      "MERCHANT_SECRET"
    ).trim();
    this.payhereNotifyUrl = (
      this.configService.get<string>("PAYHERE_NOTIFY_URL") ||
      "http://localhost:4000/api/payments/webhook"
    ).trim();
    this.payhereReturnUrl = (
      this.configService.get<string>("PAYHERE_RETURN_URL") ||
      "http://localhost:3000/payment/success"
    ).trim();
    this.payhereCancelUrl = (
      this.configService.get<string>("PAYHERE_CANCEL_URL") ||
      "http://localhost:3000/payment/cancel"
    ).trim();
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
    return createHash("md5").update(payload).digest("hex").toUpperCase();
  }

  async createCardSetupIntent(userId: string): Promise<{
    setupId: string;
    expiresAt: number;
    signature: string;
    provider: "payhere";
    hostedUrl: string | null;
    callbackUrl: string;
  }> {
    const setupId = randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const signature = this.generateCardSetupSignature(
      setupId,
      userId,
      expiresAt,
    );
    const callbackUrl =
      this.configService.get<string>("MOBILE_CARD_SETUP_CALLBACK_URL") ||
      "evrs://wallet/card-setup";

    const hostedSetupBaseUrl = this.configService.get<string>(
      "PAYHERE_CARD_SETUP_URL",
    );
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
      provider: "payhere",
      hostedUrl,
      callbackUrl,
    };
  }

  async confirmCardSetup(userId: string, dto: ConfirmCardSetupDto) {
    const now = Date.now();
    if (dto.expiresAt <= now) {
      throw new BadRequestException("Card setup session expired");
    }

    const expected = this.generateCardSetupSignature(
      dto.setupId,
      userId,
      dto.expiresAt,
    );
    if (expected !== dto.signature) {
      throw new BadRequestException("Invalid card setup signature");
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
    const merchantSecretHash = createHash("md5")
      .update(this.payhereMerchantSecret)
      .digest("hex")
      .toUpperCase();

    const hash = createHash("md5")
      .update(
        `${merchantId}${orderId}${amountFormatted}${currencyCode}${merchantSecretHash}`,
      )
      .digest("hex")
      .toUpperCase();
    return hash;
  }

  async createPaymentIntent(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<any> {
    const { bookingId, amount, paymentMethod } = createPaymentDto;
    const normalizedMethod = (paymentMethod || "payhere").toLowerCase();

    try {
      if (normalizedMethod === "payhere") {
        this.assertPayHereConfigured();
      }

      if (amount <= 0) {
        throw new BadRequestException("Payment amount must be greater than 0");
      }

      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ["user", "charger"],
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      if (booking.userId !== userId) {
        throw new BadRequestException(
          "Cannot create payment for another user booking",
        );
      }

      if ((booking.paymentStatus || "").toLowerCase() === "success") {
        throw new BadRequestException("Booking payment is already completed");
      }

      // Calculate commission: 6% system fee, 94% owner revenue
      const systemCommission = Number((amount * 0.06).toFixed(2));
      const ownerRevenue = Number((amount * 0.94).toFixed(2));

      const payment = this.paymentRepository.create({
        bookingId,
        amount,
        systemCommission,
        ownerRevenue,
        status: "pending",
        paymentMethod: normalizedMethod,
        provider: normalizedMethod,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      if (normalizedMethod == "wallet") {
        let walletResult: {
          transactionId: string;
          availableBalance: number;
          currency: string;
        };

        try {
          walletResult = await this.paymentRepository.manager.transaction(
            async (manager) => {
              const walletRepo = manager.getRepository(WalletEntity);
              const walletTransactionRepo = manager.getRepository(
                WalletTransactionEntity,
              );
              const paymentRepo = manager.getRepository(PaymentEntity);
              const bookingRepo = manager.getRepository(BookingEntity);

              const wallet = await walletRepo.findOne({ where: { userId } });
              if (!wallet) {
                throw new BadRequestException(
                  "Wallet not found. Please top up your wallet first.",
                );
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
                  source: "booking_wallet_payment",
                },
              });

              const savedWalletTx = await walletTransactionRepo.save(walletTx);

              await paymentRepo.update(savedPayment.id, {
                status: "succeeded",
                txnId: savedWalletTx.transactionId,
              });

              await bookingRepo.update(bookingId, {
                status:
                  booking.status === "pending" ? "confirmed" : booking.status,
                paymentStatus: "success",
              });

              return {
                transactionId: savedWalletTx.transactionId,
                availableBalance: this.toMoney(
                  wallet.balance - (wallet.heldBalance || 0),
                ),
                currency: wallet.currency || "LKR",
              };
            },
          );
        } catch (error) {
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException
          ) {
            throw error;
          }
          this.logger.error(
            "Wallet payment transaction failed",
            error as Error,
          );
          throw new BadRequestException(
            "Unable to process wallet payment at the moment.",
          );
        }

        // Notification delivery should never fail a successful payment.
        try {
          await this.notificationsService.sendPaymentSuccess(
            userId,
            amount,
            savedPayment.id,
          );
        } catch (notificationError) {
          this.logger.warn(
            `Payment success notification failed for payment ${savedPayment.id}: ${String(notificationError)}`,
          );
        }

        await this.notifyOwnerBookingPaymentReceived(payment.bookingId);

        return {
          id: savedPayment.id,
          status: "succeeded",
          amount: savedPayment.amount,
          paymentMethod: "wallet",
          transactionId: walletResult.transactionId,
          wallet: {
            availableBalance: walletResult.availableBalance,
            currency: walletResult.currency,
          },
        };
      }

      try {
        const orderId = savedPayment.id;
        const currency = "LKR";
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
          first_name: booking.user?.name?.split(" ")[0] || "Customer",
          last_name: booking.user?.name?.split(" ").slice(1).join(" ") || "",
          email: "customer@evrs.lk", // Default email for PayHere
          phone:
            this.normalizeSriLankanPhone(booking.user?.phoneNumber || "") ||
            "0771234567",
          address: booking.charger?.address || "Colombo",
          city: "Colombo",
          country: "Sri Lanka",
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
        await this.paymentRepository.update(savedPayment.id, {
          status: "failed",
        });
        throw new BadRequestException(
          `Payment creation failed: ${error.message}`,
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected payment intent error for booking ${bookingId}: ${String(error)}`,
      );
      throw new BadRequestException(
        "Unable to process payment at the moment. Please try again.",
      );
    }
  }

  async handleWebhook(payload: any): Promise<any> {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id,
    } = payload || {};

    if (!order_id || !status_code || !md5sig) {
      throw new BadRequestException("Malformed webhook payload");
    }

    // 1. Signature check (timing-safe).
    const merchantSecretHash = createHash("md5")
      .update(this.payhereMerchantSecret)
      .digest("hex")
      .toUpperCase();

    const localHash = createHash("md5")
      .update(
        `${merchant_id}${order_id}${payhere_amount}${String(payhere_currency).toUpperCase()}${status_code}${merchantSecretHash}`,
      )
      .digest("hex")
      .toUpperCase();

    const incoming = Buffer.from(String(md5sig).toUpperCase());
    const expected = Buffer.from(localHash);

    if (
      incoming.length !== expected.length ||
      !timingSafeEqual(incoming, expected)
    ) {
      this.logger.warn(
        `PayHere webhook rejected: signature mismatch for order_id=${order_id}`,
      );
      throw new BadRequestException("Invalid webhook signature");
    }

    // 2. Look up the originating payment row.
    const payment = await this.paymentRepository.findOne({
      where: { id: order_id },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // 3. Server-side amount tampering check. Webhook amount must match what
    //    we wrote when we created the payment row.
    const reportedAmount = Number(payhere_amount);
    if (
      Number.isFinite(reportedAmount) &&
      Number(payment.amount).toFixed(2) !== reportedAmount.toFixed(2)
    ) {
      this.logger.error(
        `PayHere webhook rejected: amount mismatch for order_id=${order_id} expected=${payment.amount} got=${reportedAmount}`,
      );
      throw new BadRequestException("Webhook amount mismatch");
    }

    // 4. Idempotency: PayHere retries on non-2xx. Re-applying success or
    //    failure logic would double-credit wallets / double-notify users.
    //    The unique (provider, externalReference) index in
    //    processed_payment_webhooks acts as the deduplication lock.
    const externalReference =
      typeof payment_id === "string" && payment_id.length > 0
        ? payment_id
        : `order:${order_id}:status:${status_code}`;

    try {
      await this.dataSource.query(
        `INSERT INTO processed_payment_webhooks
           (provider, "externalReference", "paymentId", "statusCode")
         VALUES ($1, $2, $3, $4)`,
        ["payhere", externalReference, payment.id, String(status_code)],
      );
    } catch (err: any) {
      // 23505 = unique_violation. We have already processed this webhook.
      if (err?.code === "23505") {
        this.logger.log(
          `PayHere webhook replay ignored for payment ${payment.id} ref ${externalReference}`,
        );
        return { received: true, duplicate: true };
      }
      throw err;
    }

    // 5. Apply the state transition exactly once.
    switch (parseInt(status_code)) {
      case 2:
        await this.handlePaymentSuccess(payment, payment_id);
        break;
      case 0:
        await this.paymentRepository.update(payment.id, {
          status: "processing",
          txnId: payment_id,
        });
        break;
      case -1:
      case -2:
      case -3:
        await this.handlePaymentFailure(payment, status_code);
        break;
      default:
        this.logger.warn(`Unknown PayHere status code: ${status_code}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(
    payment: PaymentEntity,
    transactionId: string,
  ): Promise<void> {
    if (payment.status === "succeeded") {
      this.logger.log(
        `Payment ${payment.id} already marked as succeeded. Skipping duplicate success handling.`,
      );
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: "succeeded",
      txnId: transactionId,
    });

    // Re-read so the row we hand to the receipts service reflects the
    // status: "succeeded" we just wrote.
    const refreshed = await this.paymentRepository.findOne({
      where: { id: payment.id },
    });

    const booking = await this.bookingRepository.findOne({
      where: { id: payment.bookingId },
    });

    if (booking && booking.status === "pending") {
      await this.bookingRepository.update(booking.id, {
        status: "confirmed",
      });
    }

    // Issue the receipt before notifying so the FCM payload can already point
    // at /receipts/:id when the app deep-links. The receipts service is
    // idempotent — a webhook retry that re-enters here is harmless.
    if (refreshed && booking) {
      try {
        await this.receiptsService.issueForPayment({
          payment: refreshed,
          booking,
        });
      } catch (err) {
        this.logger.warn(
          `Receipt issue failed for payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Send payment success notification
    if (booking) {
      await this.notificationsService.sendPaymentSuccess(
        booking.userId,
        payment.amount,
        payment.id,
      );

      await this.notifyOwnerBookingPaymentReceived(payment.bookingId);
    }

    this.logger.log(
      `Payment ${payment.id} succeeded. Booking ${payment.bookingId} confirmed.`,
    );
  }

  private async handlePaymentFailure(
    payment: PaymentEntity,
    statusCode: string,
  ): Promise<void> {
    await this.paymentRepository.update(payment.id, {
      status: "failed",
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

  private async notifyOwnerBookingPaymentReceived(
    bookingId: string,
  ): Promise<void> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ["charger", "charger.owner"],
      });

      const ownerPhone = booking?.charger?.owner?.phoneNumber;
      if (!booking || !ownerPhone) {
        return;
      }

      await this.smsService.sendBookingPaymentReceivedSMS(ownerPhone, {
        ownerName: booking.charger.owner?.name,
        chargerName: booking.charger.name || "your charger",
      });
    } catch (error) {
      this.logger.warn(
        `Owner payment SMS notification failed for booking ${bookingId}: ${String(error)}`,
      );
    }
  }

  async confirmPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ["booking"],
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async findAll(): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      relations: ["booking"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ["booking"],
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async findByBooking(bookingId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { bookingId },
      order: { createdAt: "DESC" },
    });
  }

  async findUserTransactions(
    userId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ transactions: PaymentEntity[]; total: number }> {
    const query = this.paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.booking", "booking")
      .leftJoinAndSelect("booking.charger", "charger")
      .where("booking.userId = :userId", { userId });

    if (filters?.status) {
      query.andWhere("payment.status = :status", { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere("payment.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere("payment.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    query.orderBy("payment.createdAt", "DESC");

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

  private assertPayHereConfigured(): void {
    const merchantId = this.payhereMerchantId.trim();
    const merchantSecret = this.payhereMerchantSecret.trim();

    const invalidMerchantId =
      !merchantId || merchantId.toUpperCase() === "MERCHANT_ID";
    const invalidMerchantSecret =
      !merchantSecret || merchantSecret.toUpperCase() === "MERCHANT_SECRET";

    if (invalidMerchantId || invalidMerchantSecret) {
      throw new BadRequestException(
        "PayHere sandbox is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET in backend environment.",
      );
    }
  }

  private normalizeSriLankanPhone(phone: string): string {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("0") && digits.length === 10) {
      return digits;
    }

    if (digits.startsWith("94") && digits.length === 11) {
      return `0${digits.substring(2)}`;
    }

    if (digits.length === 9 && digits.startsWith("7")) {
      return `0${digits}`;
    }

    return digits;
  }

  /**
   * Refund a previously-succeeded payment.
   *
   * Today this updates ledger state and notifies the user; the actual
   * gateway-side reversal is left as a TODO because PayHere's refund API
   * is account-scoped and we don't want to wire it without credentials.
   *
   *   - Only an admin or the original payer may initiate a refund (controller
   *     checks the role; service double-checks via `requesterUserId`).
   *   - Partial refunds supported via `dto.amount`.
   *   - Booking status flips to `cancelled` only on a full refund.
   *   - The corresponding receipt is marked `refunded` with the refund amount.
   */
  async refundPayment(
    paymentId: string,
    dto: { amount?: number; reason: string },
    requesterUserId: string,
    requesterRole: string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ["booking"],
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.status === "refunded") {
      throw new BadRequestException("Payment already refunded");
    }
    if (payment.status !== "succeeded") {
      throw new BadRequestException(
        `Only succeeded payments can be refunded (current status: ${payment.status})`,
      );
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: payment.bookingId },
    });

    const isAdmin = requesterRole === "admin";
    const isPayer = booking?.userId === requesterUserId;
    if (!isAdmin && !isPayer) {
      throw new BadRequestException(
        "Not authorized to refund this payment",
      );
    }

    const totalAmount = Number(payment.amount);
    const refundAmount = dto.amount ?? totalAmount;
    if (refundAmount <= 0) {
      throw new BadRequestException("Refund amount must be positive");
    }
    if (refundAmount > totalAmount) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds payment amount (${totalAmount})`,
      );
    }
    const isFullRefund = refundAmount === totalAmount;

    // TODO: call PayHere refund API here when production credentials are
    // wired. For now we trust the admin-driven status flip — every refund
    // is recorded in metadata so reconciliation can replay it later.
    const existingMeta = (() => {
      try {
        return payment.metadata ? JSON.parse(payment.metadata) : {};
      } catch {
        return {};
      }
    })();
    const refundLog = {
      ...existingMeta,
      refund: {
        amount: refundAmount,
        reason: dto.reason,
        requestedBy: requesterUserId,
        requestedAt: new Date().toISOString(),
      },
    };

    await this.paymentRepository.update(payment.id, {
      status: isFullRefund ? "refunded" : "succeeded",
      metadata: JSON.stringify(refundLog),
    });

    // On full refund, free up the booked slot so the charger can be rebooked.
    if (isFullRefund && booking && booking.status !== "cancelled") {
      await this.bookingRepository.update(booking.id, {
        status: "cancelled",
        cancelReason: `Refunded: ${dto.reason}`,
        cancelledAt: new Date(),
      });
    }

    // Reflect on the receipt.
    try {
      await this.receiptsService.markRefunded(payment.id, refundAmount);
    } catch (err) {
      this.logger.warn(
        `Failed to mark receipt refunded for payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Notify the user.
    if (booking) {
      try {
        await this.notificationsService.sendToUser(
          booking.userId,
          NotificationType.REFUND_PROCESSED,
          {
            title: "Refund processed",
            body: `LKR ${refundAmount.toFixed(2)} refunded to your original payment method`,
            data: {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              navigate: `/payments/${payment.id}`,
            },
          },
        );
      } catch (err) {
        this.logger.warn(
          `Refund notification failed for payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const refreshed = await this.paymentRepository.findOne({
      where: { id: payment.id },
    });
    return refreshed ?? payment;
  }
}
