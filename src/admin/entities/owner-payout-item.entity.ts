import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { OwnerPayout } from "./owner-payout.entity";
import { PaymentEntity } from "../../payments/entities/payment.entity";
import { BookingEntity } from "../../bookings/entities/booking.entity";

@Entity("owner_payout_items")
export class OwnerPayoutItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index("idx_owner_payout_items_payout_id")
  payoutId: string;

  @ManyToOne(() => OwnerPayout, (payout) => payout.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "payoutId" })
  payout: OwnerPayout;

  @Column({ type: "uuid" })
  @Index("idx_owner_payout_items_payment_id", { unique: true })
  paymentId: string;

  @ManyToOne(() => PaymentEntity)
  @JoinColumn({ name: "paymentId" })
  payment: PaymentEntity;

  @Column({ type: "uuid" })
  bookingId: string;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: "bookingId" })
  booking: BookingEntity;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  ownerRevenueAtPaymentTime: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  includeAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
