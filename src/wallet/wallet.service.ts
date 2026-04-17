import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import { ChargingService } from "../charging/charging.service";
import { Charger } from "../charger/entities/charger.entity";
import { UserEntity } from "../users/entities/user.entity";
import { StartChargingDto } from "./dto/start-charging.dto";
import { StopChargingDto } from "./dto/stop-charging.dto";
import { WalletTopupDto } from "./dto/wallet-topup.dto";
import {
  ChargingSessionEntity,
  ChargingSessionStatus,
} from "./entities/charging-session.entity";
import {
  WalletTransactionEntity,
  WalletTransactionStatus,
  WalletTransactionType,
} from "./entities/wallet-transaction.entity";
import { WalletEntity } from "./entities/wallet.entity";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly minimumWalletBalance: number;
  private readonly minimumTopupAmount: number;
  private readonly maximumTopupAmount: number;
  private readonly maximumHoldAmount: number;

  private readonly payhereBaseUrl: string;
  private readonly payhereMerchantId: string;
  private readonly payhereMerchantSecret: string;
  private readonly payhereNotifyUrl: string;
  private readonly payhereReturnUrl: string;
  private readonly payhereCancelUrl: string;
  private readonly allowUnsafeReturnConfirmation: boolean;

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionRepository: Repository<WalletTransactionEntity>,
    @InjectRepository(ChargingSessionEntity)
    private readonly chargingSessionRepository: Repository<ChargingSessionEntity>,
    @InjectRepository(Charger)
    private readonly chargerRepository: Repository<Charger>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly chargingService: ChargingService,
  ) {
    this.minimumWalletBalance = Number(
      this.configService.get<string>("WALLET_MINIMUM_BALANCE") || "500",
    );
    this.minimumTopupAmount = Number(
      this.configService.get<string>("WALLET_MIN_TOPUP_AMOUNT") || "100",
    );
    this.maximumTopupAmount = Number(
      this.configService.get<string>("WALLET_MAX_TOPUP_AMOUNT") || "500000",
    );
    this.maximumHoldAmount = Number(
      this.configService.get<string>("WALLET_MAX_HOLD_AMOUNT") || "10000",
    );

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
      "http://localhost:4000/api/payment/webhook"
    ).trim();
    this.payhereReturnUrl = (
      this.configService.get<string>("PAYHERE_RETURN_URL") ||
      "http://localhost:3000/payment/success"
    ).trim();
    this.payhereCancelUrl = (
      this.configService.get<string>("PAYHERE_CANCEL_URL") ||
      "http://localhost:3000/payment/cancel"
    ).trim();
    this.allowUnsafeReturnConfirmation =
      String(
        this.configService.get<string>("PAYHERE_ALLOW_RETURN_FALLBACK") ||
          "false",
      )
        .trim()
        .toLowerCase() === "true";
  }

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      userId: wallet.userId,
      balance: this.toMoney(wallet.balance),
      heldBalance: this.toMoney(wallet.heldBalance),
      availableBalance: this.toMoney(this.availableBalance(wallet)),
      currency: wallet.currency,
      updatedAt: wallet.updatedAt,
    };
  }

  async listTransactions(userId: string, limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit || 50, 1), 100);
    const safeOffset = Math.max(offset || 0, 0);

    const [transactions, total] =
      await this.walletTransactionRepository.findAndCount({
        where: { userId },
        order: { createdAt: "DESC" },
        take: safeLimit,
        skip: safeOffset,
      });

    return { transactions, total, limit: safeLimit, offset: safeOffset };
  }

  async listSessions(
    userId: string,
    status?: ChargingSessionStatus,
    limit = 50,
    offset = 0,
  ) {
    const safeLimit = Math.min(Math.max(limit || 50, 1), 100);
    const safeOffset = Math.max(offset || 0, 0);

    const whereClause: FindOptionsWhere<ChargingSessionEntity> = { userId };
    if (status) whereClause.status = status;

    const [sessions, total] = await this.chargingSessionRepository.findAndCount(
      {
        where: whereClause,
        order: { createdAt: "DESC" },
        take: safeLimit,
        skip: safeOffset,
      },
    );

    return { sessions, total, limit: safeLimit, offset: safeOffset };
  }

  async createTopup(userId: string, dto: WalletTopupDto) {
    this.assertPayHereConfigured();

    const amount = this.toMoney(dto.amount);
    if (amount < this.minimumTopupAmount) {
      throw new BadRequestException(
        `Top-up amount must be at least LKR ${this.minimumTopupAmount.toFixed(2)}`,
      );
    }

    if (amount > this.maximumTopupAmount) {
      throw new BadRequestException(
        `Top-up amount cannot exceed LKR ${this.maximumTopupAmount.toFixed(2)}`,
      );
    }

    const [wallet, user] = await Promise.all([
      this.getOrCreateWallet(userId),
      this.userRepository.findOne({ where: { id: userId } }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const orderId = randomUUID();
    const customerName = (user.name || "EVRS Customer").trim();
    const [firstName, ...restNames] = customerName.split(/\s+/);
    const lastName = restNames.join(" ");
    const rawPhone = String(user.phoneNumber || "").trim();
    const sanitizedPhone = this.normalizeSriLankanPhone(rawPhone);
    const rawEmail =
      typeof (user as any).email === "string"
        ? String((user as any).email).trim()
        : "";
    const hasUsableEmail = rawEmail.includes("@") && rawEmail.includes(".");
    const userEmail = hasUsableEmail ? rawEmail : "no-reply@evrs.lk";

    const transaction = await this.walletTransactionRepository.save(
      this.walletTransactionRepository.create({
        userId,
        type: WalletTransactionType.TOPUP,
        amount,
        status: WalletTransactionStatus.PENDING,
        referenceId: orderId,
        metadata: {
          provider: "payhere",
          callbackContext: dto.callbackContext || null,
        },
      }),
    );

    const currency = String(wallet.currency || "LKR").toUpperCase();

    const payhereData = {
      merchant_id: this.payhereMerchantId,
      return_url: this.payhereReturnUrl,
      cancel_url: this.payhereCancelUrl,
      notify_url: this.payhereNotifyUrl,
      order_id: orderId,
      items: `EVRS Wallet Top-up (${userId.slice(0, 8)})`,
      currency,
      amount: amount.toFixed(2),
      first_name: firstName || "EVRS",
      last_name: lastName || "Customer",
      email: userEmail,
      phone: sanitizedPhone || "0770000000",
      address: "Sri Lanka",
      city: "Colombo",
      country: "Sri Lanka",
      hash: this.generatePayHereCheckoutHash(orderId, amount, currency),
      custom_1: userId,
      custom_2: transaction.transactionId,
    };

    return {
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount,
      currency: wallet.currency,
      checkoutUrl: `${this.payhereBaseUrl}/pay/checkout`,
      checkoutData: payhereData,
    };
  }

  async handlePayhereWebhook(payload: Record<string, any>) {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id,
    } = payload;

    if (
      !merchant_id ||
      !order_id ||
      !payhere_amount ||
      !payhere_currency ||
      !status_code ||
      !md5sig
    ) {
      throw new BadRequestException("Invalid webhook payload");
    }

    if (merchant_id !== this.payhereMerchantId) {
      throw new BadRequestException("Invalid merchant id");
    }

    this.verifyPayHereWebhookHash(
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      String(status_code),
      md5sig,
    );

    const transaction = await this.walletTransactionRepository.findOne({
      where: {
        referenceId: order_id,
        type: WalletTransactionType.TOPUP,
      },
    });

    if (!transaction) {
      this.logger.warn(`PayHere webhook for unknown order ${order_id}`);
      return { received: true, ignored: true };
    }

    if (transaction.status === WalletTransactionStatus.SUCCESS) {
      return {
        received: true,
        idempotent: true,
        transactionId: transaction.transactionId,
      };
    }

    if (this.toMoney(payhere_amount) !== this.toMoney(transaction.amount)) {
      throw new BadRequestException(
        "Webhook amount does not match transaction amount",
      );
    }

    const wallet = await this.getOrCreateWallet(transaction.userId);
    if (
      String(payhere_currency).toUpperCase() !==
      String(wallet.currency).toUpperCase()
    ) {
      throw new BadRequestException(
        "Webhook currency does not match wallet currency",
      );
    }

    const statusCode = Number(status_code);

    if (statusCode === 2) {
      const result = await this.creditWalletForTopup(
        transaction.transactionId,
        {
          paymentId: payment_id,
          payhereAmount: payhere_amount,
          payhereCurrency: payhere_currency,
        },
      );
      return {
        received: true,
        ...result,
      };
    }

    await this.walletTransactionRepository.update(transaction.transactionId, {
      status: WalletTransactionStatus.FAILED,
      metadata: {
        ...(transaction.metadata || {}),
        webhookStatusCode: statusCode,
      },
    });

    return {
      received: true,
      failed: true,
      transactionId: transaction.transactionId,
    };
  }

  async confirmTopupFromReturn(userId: string, payload: Record<string, any>) {
    const orderId = String(payload?.order_id || payload?.orderId || "").trim();
    const rawStatusCode = String(
      payload?.status_code || payload?.statusCode || "",
    ).trim();
    const statusCode = Number(rawStatusCode);

    if (!orderId) {
      throw new BadRequestException("Missing order_id in callback payload");
    }

    const transaction = await this.walletTransactionRepository.findOne({
      where: {
        userId,
        referenceId: orderId,
        type: WalletTransactionType.TOPUP,
      },
    });

    if (!transaction) {
      throw new NotFoundException("Top-up transaction not found for this user");
    }

    if (transaction.status === WalletTransactionStatus.SUCCESS) {
      return {
        received: true,
        idempotent: true,
        transactionId: transaction.transactionId,
      };
    }

    if (!Number.isFinite(statusCode) || statusCode <= 0) {
      return {
        received: true,
        pendingVerification: true,
        transactionId: transaction.transactionId,
      };
    }

    if (statusCode !== 2) {
      await this.walletTransactionRepository.update(transaction.transactionId, {
        status: WalletTransactionStatus.FAILED,
        metadata: {
          ...(transaction.metadata || {}),
          callbackStatusCode: statusCode,
          callbackConfirmedAt: new Date().toISOString(),
        },
      });

      return {
        received: true,
        failed: true,
        transactionId: transaction.transactionId,
      };
    }

    const merchantId = String(payload?.merchant_id || "").trim();
    const incomingHash = String(payload?.md5sig || "").trim();
    const payhereAmount = String(
      payload?.payhere_amount || transaction.amount,
    ).trim();
    const payhereCurrency = String(payload?.payhere_currency || "LKR").trim();

    const hasSignaturePayload =
      !!merchantId && !!incomingHash && !!payhereAmount && !!payhereCurrency;

    if (hasSignaturePayload) {
      if (merchantId !== this.payhereMerchantId) {
        throw new BadRequestException("Invalid merchant id");
      }

      this.verifyPayHereWebhookHash(
        merchantId,
        orderId,
        payhereAmount,
        payhereCurrency,
        rawStatusCode,
        incomingHash,
      );
    } else if (!this.allowUnsafeReturnConfirmation) {
      return {
        received: true,
        pendingVerification: true,
        transactionId: transaction.transactionId,
      };
    } else {
      this.logger.warn(
        `Top-up ${transaction.transactionId} confirmed via return fallback without webhook signature`,
      );
    }

    const result = await this.creditWalletForTopup(transaction.transactionId, {
      paymentId: payload?.payment_id,
      payhereAmount,
      payhereCurrency,
      confirmedVia: hasSignaturePayload
        ? "return_signature"
        : "return_fallback",
    });

    return {
      received: true,
      transactionId: result.transactionId,
      walletBalance: result.walletBalance,
      confirmedVia: hasSignaturePayload
        ? "return_signature"
        : "return_fallback",
    };
  }

  async startCharging(userId: string, dto: StartChargingDto) {
    const charger = await this.chargerRepository.findOne({
      where: { id: dto.chargerId },
    });

    if (!charger) {
      throw new NotFoundException("Charger not found");
    }

    if (charger.isBanned || charger.status === "offline") {
      throw new BadRequestException(
        "Selected charger is not available for charging",
      );
    }

    const lockAmount = dto.lockAmount ?? true;
    const holdAmount = this.toMoney(
      dto.holdAmount ?? this.minimumWalletBalance,
    );

    if (lockAmount && holdAmount > this.maximumHoldAmount) {
      throw new BadRequestException(
        `Hold amount cannot exceed LKR ${this.maximumHoldAmount.toFixed(2)}`,
      );
    }

    const session = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const sessionRepo = manager.getRepository(ChargingSessionEntity);

      const activeSession = await sessionRepo.findOne({
        where: { userId, status: ChargingSessionStatus.ACTIVE },
        lock: { mode: "pessimistic_read" },
      });

      if (activeSession) {
        throw new BadRequestException(
          "User already has an active charging session",
        );
      }

      let wallet = await walletRepo.findOne({
        where: { userId },
        lock: { mode: "pessimistic_write" },
      });

      if (!wallet) {
        wallet = walletRepo.create({
          userId,
          balance: 0,
          heldBalance: 0,
          currency: "LKR",
        });
      }

      const available = this.availableBalance(wallet);

      if (available < this.minimumWalletBalance) {
        throw new BadRequestException(
          `Minimum available balance of LKR ${this.minimumWalletBalance.toFixed(2)} is required`,
        );
      }

      if (lockAmount && available < holdAmount) {
        throw new BadRequestException(
          `Insufficient wallet balance for hold amount of LKR ${holdAmount.toFixed(2)}`,
        );
      }

      if (lockAmount) {
        wallet.heldBalance = this.toMoney(
          this.toMoney(wallet.heldBalance) + holdAmount,
        );
      }

      await walletRepo.save(wallet);

      const createdSession = sessionRepo.create({
        userId,
        chargerId: dto.chargerId,
        externalSessionId: null,
        startTime: new Date(),
        endTime: null,
        unitsConsumed: 0,
        pricePerKwh: this.toMoney(charger.pricePerKwh || 0),
        totalCost: 0,
        heldAmount: lockAmount ? holdAmount : 0,
        status: ChargingSessionStatus.ACTIVE,
        metadata: {
          connectorId: dto.connectorId || 1,
          chargeBoxIdentity: dto.chargeBoxIdentity || null,
        },
      });

      return sessionRepo.save(createdSession);
    });

    try {
      const externalSession = await this.chargingService.createSession(
        userId,
        dto.chargerId,
        dto.connectorId || 1,
        dto.chargeBoxIdentity,
      );

      const externalSessionId =
        externalSession?.sessionId ||
        externalSession?.id ||
        externalSession?.data?.id ||
        null;

      if (externalSessionId) {
        await this.chargingService.startCharging(externalSessionId);
        await this.chargingSessionRepository.update(session.sessionId, {
          externalSessionId: String(externalSessionId),
        });
      }
    } catch (error) {
      this.logger.error(
        `Charging start failed for wallet session ${session.sessionId}: ${error.message}`,
      );
      await this.failSessionAndReleaseHold(session.sessionId, error.message);
      throw new BadRequestException("Unable to start charging session");
    }

    const updatedSession = await this.chargingSessionRepository.findOne({
      where: { sessionId: session.sessionId },
    });

    const wallet = await this.getWallet(userId);

    return {
      session: updatedSession,
      wallet,
    };
  }

  async stopCharging(userId: string, dto: StopChargingDto) {
    const session = await this.chargingSessionRepository.findOne({
      where: {
        sessionId: dto.sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException("Charging session not found");
    }

    if (session.status === ChargingSessionStatus.COMPLETED) {
      const wallet = await this.getWallet(userId);
      return {
        session,
        wallet,
        idempotent: true,
      };
    }

    if (session.status !== ChargingSessionStatus.ACTIVE) {
      throw new BadRequestException("Only active sessions can be stopped");
    }

    let externalUnits: number | undefined;
    if (session.externalSessionId) {
      try {
        const stopResult = await this.chargingService.stopCharging(
          session.externalSessionId,
        );
        externalUnits = this.extractUnitsConsumed(stopResult);
      } catch (error) {
        this.logger.warn(
          `External stop failed for ${session.externalSessionId}: ${error.message}`,
        );
      }
    }

    const unitsConsumed = this.toMoney(
      externalUnits ?? dto.unitsConsumed ?? session.unitsConsumed,
      4,
    );

    if (unitsConsumed <= 0) {
      throw new BadRequestException(
        "Unable to determine consumed units for the session",
      );
    }

    const totalCost = this.toMoney(
      unitsConsumed * this.toMoney(session.pricePerKwh),
    );

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const sessionRepo = manager.getRepository(ChargingSessionEntity);
      const transactionRepo = manager.getRepository(WalletTransactionEntity);

      const lockedSession = await sessionRepo.findOne({
        where: { sessionId: session.sessionId },
        lock: { mode: "pessimistic_write" },
      });

      if (
        !lockedSession ||
        lockedSession.status !== ChargingSessionStatus.ACTIVE
      ) {
        throw new BadRequestException("Charging session is not active");
      }

      const wallet = await walletRepo.findOne({
        where: { userId },
        lock: { mode: "pessimistic_write" },
      });

      if (!wallet) {
        throw new BadRequestException("Wallet not found for user");
      }

      if (this.toMoney(lockedSession.heldAmount) > 0) {
        wallet.heldBalance = this.toMoney(
          Math.max(
            0,
            this.toMoney(wallet.heldBalance) -
              this.toMoney(lockedSession.heldAmount),
          ),
        );
      }

      const availableAfterHoldRelease = this.availableBalance(wallet);
      if (availableAfterHoldRelease < totalCost) {
        throw new BadRequestException(
          "Insufficient wallet balance to settle charging session",
        );
      }

      wallet.balance = this.toMoney(this.toMoney(wallet.balance) - totalCost);
      await walletRepo.save(wallet);

      lockedSession.unitsConsumed = unitsConsumed;
      lockedSession.totalCost = totalCost;
      lockedSession.endTime = new Date();
      lockedSession.status = ChargingSessionStatus.COMPLETED;
      lockedSession.metadata = {
        ...(lockedSession.metadata || {}),
        stopSource: externalUnits !== undefined ? "external" : "api",
      };
      await sessionRepo.save(lockedSession);

      await transactionRepo.save(
        transactionRepo.create({
          userId,
          type: WalletTransactionType.PAYMENT,
          amount: totalCost,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: `SESSION:${lockedSession.sessionId}`,
          metadata: {
            sessionId: lockedSession.sessionId,
            unitsConsumed,
            pricePerKwh: this.toMoney(lockedSession.pricePerKwh),
          },
        }),
      );
    });

    const [updatedSession, wallet] = await Promise.all([
      this.chargingSessionRepository.findOne({
        where: { sessionId: session.sessionId },
      }),
      this.getWallet(userId),
    ]);

    return {
      session: updatedSession,
      wallet,
    };
  }

  private async failSessionAndReleaseHold(sessionId: string, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const sessionRepo = manager.getRepository(ChargingSessionEntity);
      const txRepo = manager.getRepository(WalletTransactionEntity);

      const session = await sessionRepo.findOne({
        where: { sessionId },
        lock: { mode: "pessimistic_write" },
      });

      if (!session || session.status !== ChargingSessionStatus.ACTIVE) {
        return;
      }

      const holdAmount = this.toMoney(session.heldAmount);

      if (holdAmount > 0) {
        const wallet = await walletRepo.findOne({
          where: { userId: session.userId },
          lock: { mode: "pessimistic_write" },
        });

        if (wallet) {
          wallet.heldBalance = this.toMoney(
            Math.max(0, this.toMoney(wallet.heldBalance) - holdAmount),
          );
          await walletRepo.save(wallet);
        }

        await txRepo.save(
          txRepo.create({
            userId: session.userId,
            type: WalletTransactionType.REFUND,
            amount: holdAmount,
            status: WalletTransactionStatus.SUCCESS,
            referenceId: `FAILED_SESSION_RELEASE:${session.sessionId}`,
            metadata: {
              sessionId: session.sessionId,
              reason,
            },
          }),
        );
      }

      session.status = ChargingSessionStatus.FAILED;
      session.endTime = new Date();
      session.metadata = {
        ...(session.metadata || {}),
        failedReason: reason,
      };
      await sessionRepo.save(session);
    });
  }

  private async creditWalletForTopup(
    transactionId: string,
    webhookData: {
      paymentId?: string;
      payhereAmount: string;
      payhereCurrency: string;
      confirmedVia?: string;
    },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(WalletTransactionEntity);
      const walletRepo = manager.getRepository(WalletEntity);

      const transaction = await txRepo.findOne({
        where: { transactionId },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        throw new NotFoundException("Wallet transaction not found");
      }

      if (transaction.status === WalletTransactionStatus.SUCCESS) {
        return {
          idempotent: true,
          transactionId: transaction.transactionId,
        };
      }

      const wallet = await this.getOrCreateWallet(
        transaction.userId,
        manager,
        true,
      );
      const topupAmount = this.toMoney(transaction.amount);

      wallet.balance = this.toMoney(this.toMoney(wallet.balance) + topupAmount);
      await walletRepo.save(wallet);

      transaction.status = WalletTransactionStatus.SUCCESS;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        paymentId: webhookData.paymentId,
        payhereAmount: webhookData.payhereAmount,
        payhereCurrency: webhookData.payhereCurrency,
        confirmedVia: webhookData.confirmedVia || "webhook",
        processedAt: new Date().toISOString(),
      };
      await txRepo.save(transaction);

      return {
        transactionId: transaction.transactionId,
        walletBalance: this.toMoney(wallet.balance),
      };
    });
  }

  private verifyPayHereWebhookHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
    statusCode: string,
    incomingHash: string,
  ) {
    const merchantSecretHash = createHash("md5")
      .update(this.payhereMerchantSecret)
      .digest("hex")
      .toUpperCase();

    const localHash = createHash("md5")
      .update(
        `${merchantId}${orderId}${amount}${currency}${statusCode}${merchantSecretHash}`,
      )
      .digest("hex")
      .toUpperCase();

    const incoming = Buffer.from(String(incomingHash).toUpperCase());
    const expected = Buffer.from(localHash);

    if (
      incoming.length !== expected.length ||
      !timingSafeEqual(incoming, expected)
    ) {
      throw new BadRequestException("Invalid webhook signature");
    }
  }

  private generatePayHereCheckoutHash(
    orderId: string,
    amount: number,
    currency: string,
  ) {
    const currencyCode = String(currency || "LKR").toUpperCase();
    const merchantSecretHash = createHash("md5")
      .update(this.payhereMerchantSecret)
      .digest("hex")
      .toUpperCase();

    return createHash("md5")
      .update(
        `${this.payhereMerchantId}${orderId}${amount.toFixed(2)}${currencyCode}${merchantSecretHash}`,
      )
      .digest("hex")
      .toUpperCase();
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

  private async getOrCreateWallet(
    userId: string,
    manager?: EntityManager,
    lock = false,
  ): Promise<WalletEntity> {
    const repository = manager
      ? manager.getRepository(WalletEntity)
      : this.walletRepository;

    let wallet = await repository.findOne({
      where: { userId },
      ...(manager && lock
        ? { lock: { mode: "pessimistic_write" as const } }
        : {}),
    });

    if (!wallet) {
      wallet = repository.create({
        userId,
        balance: 0,
        heldBalance: 0,
        currency: "LKR",
      });
      wallet = await repository.save(wallet);
    }

    return wallet;
  }

  private extractUnitsConsumed(payload: any): number | undefined {
    const candidates = [
      payload?.unitsConsumed,
      payload?.energyConsumed,
      payload?.energyDelivered,
      payload?.totalEnergy,
      payload?.meterValues?.energyActiveImportRegister,
    ];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) {
        continue;
      }

      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return undefined;
  }

  private availableBalance(wallet: WalletEntity): number {
    return this.toMoney(
      this.toMoney(wallet.balance) - this.toMoney(wallet.heldBalance),
    );
  }

  private toMoney(
    value: number | string | null | undefined,
    scale = 2,
  ): number {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Number(numeric.toFixed(scale));
  }
}
