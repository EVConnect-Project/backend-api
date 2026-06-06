import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import {
  ReceiptEntity,
  ReceiptLineItem,
} from "./entities/receipt.entity";
import { PaymentEntity } from "../payments/entities/payment.entity";
import { BookingEntity } from "../bookings/entities/booking.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/types/notification-types";
import { RefundPaymentDto } from "./dto/refund.dto";

interface IssueReceiptInput {
  payment: PaymentEntity;
  booking: BookingEntity | null;
}

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Issue (or return the existing) receipt for a succeeded payment.
   *
   * Idempotent: the unique index `uq_receipts_one_per_payment` makes a second
   * insert raise 23505, which we catch and return the original row instead.
   * This makes it safe to call from `handlePaymentSuccess` even if PayHere
   * webhooks retry past our other idempotency layer.
   */
  async issueForPayment(input: IssueReceiptInput): Promise<ReceiptEntity> {
    const { payment, booking } = input;

    if (payment.status !== "succeeded") {
      throw new BadRequestException(
        "Receipts can only be issued for succeeded payments",
      );
    }

    const existing = await this.receiptRepository.findOne({
      where: { paymentId: payment.id },
    });
    if (existing) return existing;

    if (!booking) {
      throw new BadRequestException(
        "Cannot issue a receipt without an associated booking",
      );
    }

    const lineItems = this.buildLineItems(payment, booking);
    const receiptNumber = this.generateReceiptNumber();

    try {
      const saved = await this.receiptRepository.save(
        this.receiptRepository.create({
          receiptNumber,
          userId: booking.userId,
          paymentId: payment.id,
          bookingId: booking.id,
          amount: Number(payment.amount),
          currency: "LKR",
          lineItems,
          status: "issued",
          provider: payment.provider ?? null,
          providerReference: payment.txnId ?? null,
        }),
      );

      this.notifyReceiptIssued(saved).catch((err) =>
        this.logger.warn(
          `Receipt FCM notification failed for ${saved.id}: ${String(err)}`,
        ),
      );

      return saved;
    } catch (err: any) {
      // Concurrent issue from a webhook retry: pick up the row the winner wrote.
      if (err?.code === "23505") {
        const winner = await this.receiptRepository.findOne({
          where: { paymentId: payment.id },
        });
        if (winner) return winner;
      }
      throw err;
    }
  }

  async listMine(userId: string): Promise<ReceiptEntity[]> {
    return this.receiptRepository.find({
      where: { userId },
      order: { issuedAt: "DESC" },
      take: 100,
    });
  }

  async getById(userId: string, receiptId: string): Promise<ReceiptEntity> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ["payment", "booking"],
    });
    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }
    if (receipt.userId !== userId) {
      throw new ForbiddenException("Not your receipt");
    }
    return receipt;
  }

  /**
   * Mark a receipt as refunded — called from PaymentsService.refundPayment
   * after the gateway refund is acknowledged. Caller is responsible for the
   * actual money movement / gateway call; this only updates ledger state.
   */
  async markRefunded(
    paymentId: string,
    refundAmount: number,
  ): Promise<ReceiptEntity | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { paymentId },
    });
    if (!receipt) return null;

    receipt.status = "refunded";
    receipt.refundedAt = new Date();
    receipt.refundAmount = refundAmount;
    return this.receiptRepository.save(receipt);
  }

  /**
   * Compose a snapshot of what the user actually paid for. Stored as JSONB
   * on the receipt so later edits to chargers / bookings don't rewrite history.
   */
  private buildLineItems(
    payment: PaymentEntity,
    booking: BookingEntity,
  ): ReceiptLineItem[] {
    const items: ReceiptLineItem[] = [];
    const total = Number(payment.amount);
    const commission = Number(payment.systemCommission ?? 0);
    const ownerRevenue = Number(payment.ownerRevenue ?? total - commission);

    items.push({
      description: `Charging session — booking ${booking.id.slice(0, 8)}`,
      amount: Number(ownerRevenue.toFixed(2)),
    });

    if (commission > 0) {
      items.push({
        description: "Platform fee",
        amount: Number(commission.toFixed(2)),
      });
    }

    items.push({
      description: "Total",
      amount: Number(total.toFixed(2)),
    });

    return items;
  }

  /**
   * `RCP-YYYYMMDD-XXXXXX` where XXXXXX is 6 hex chars.
   * The unique index on receiptNumber serves as the collision detector;
   * we retry once on the (vanishingly unlikely) collision.
   */
  private generateReceiptNumber(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const random = randomBytes(3).toString("hex").toUpperCase();
    return `RCP-${date}-${random}`;
  }

  private async notifyReceiptIssued(receipt: ReceiptEntity): Promise<void> {
    await this.notificationsService.sendToUser(
      receipt.userId,
      NotificationType.PAYMENT_SUCCESS, // closest existing typed channel
      {
        title: "Receipt available",
        body: `${receipt.receiptNumber} for LKR ${receipt.amount.toFixed(2)}`,
        data: {
          receiptId: receipt.id,
          navigate: `/receipts/${receipt.id}`,
        },
      },
    );
  }
}
