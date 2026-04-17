import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BookingEntity } from "../../bookings/entities/booking.entity";

@Entity("payments")
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  bookingId: string;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: "bookingId" })
  booking: BookingEntity;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  systemCommission: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  ownerRevenue: number | null;

  @Column({
    type: "enum",
    enum: ["pending", "processing", "succeeded", "failed", "refunded"],
    default: "pending",
  })
  status: string;

  @Column({ nullable: true })
  txnId: string; // Stripe payment intent ID or PayHere transaction ID

  @Column({ nullable: true })
  paymentMethod: string; // 'stripe', 'payhere', 'card', 'wallet'

  @Column({ type: "varchar", length: 50, default: "payhere" })
  provider: string;

  @Column({ type: "varchar", nullable: true })
  transactionId: string | null;

  @Column({ type: "varchar", nullable: true })
  webhookPayload: string | null;

  @Column({ type: "boolean", default: false })
  isCommissionDeducted: boolean;

  @Column({ type: "text", nullable: true })
  metadata: string; // JSON string for additional payment details

  @Column({ type: "varchar", length: 20, default: "unsettled" })
  payoutStatus: string; // unsettled | queued | settled

  @Column({ type: "uuid", nullable: true })
  payoutId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
