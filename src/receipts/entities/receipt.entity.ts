import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PaymentEntity } from "../../payments/entities/payment.entity";
import { BookingEntity } from "../../bookings/entities/booking.entity";
import { UserEntity } from "../../users/entities/user.entity";

export type ReceiptStatus = "issued" | "refunded" | "void";

export interface ReceiptLineItem {
  description: string;
  quantity?: number;
  unitAmount?: number;
  amount: number; // total for this line
}

@Entity("receipts")
@Index("idx_receipts_user", ["userId"])
@Index("idx_receipts_payment", ["paymentId"])
@Index("idx_receipts_number", ["receiptNumber"], { unique: true })
export class ReceiptEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Human-readable receipt number — collision-free per row, surfaced to the
   * end user. Generator in ReceiptsService formats `RCP-YYYYMMDD-<short>`.
   */
  @Column({ type: "varchar", length: 32 })
  receiptNumber: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "uuid" })
  paymentId: string;

  @ManyToOne(() => PaymentEntity)
  @JoinColumn({ name: "paymentId" })
  payment: PaymentEntity;

  @Column({ type: "uuid", nullable: true })
  bookingId: string | null;

  @ManyToOne(() => BookingEntity, { nullable: true })
  @JoinColumn({ name: "bookingId" })
  booking: BookingEntity | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 8, default: "LKR" })
  currency: string;

  @Column({ type: "jsonb", default: [] })
  lineItems: ReceiptLineItem[];

  @Column({ type: "varchar", length: 16, default: "issued" })
  status: ReceiptStatus;

  @Column({ type: "varchar", length: 50, nullable: true })
  provider: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerReference: string | null;

  @Column({ type: "timestamp", nullable: true })
  refundedAt: Date | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  refundAmount: number | null;

  @CreateDateColumn()
  issuedAt: Date;
}
