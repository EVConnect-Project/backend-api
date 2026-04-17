import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";
import { OwnerPayoutItem } from "./owner-payout-item.entity";

export enum OwnerPayoutStatus {
  DRAFT = "draft",
  APPROVED = "approved",
  PROCESSING = "processing",
  PAID = "paid",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

@Entity("owner_payouts")
export class OwnerPayout {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index("idx_owner_payouts_owner_id")
  ownerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "ownerId" })
  owner: UserEntity;

  @Column({ type: "timestamp" })
  periodStart: Date;

  @Column({ type: "timestamp" })
  periodEnd: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  grossOwnerRevenue: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  adjustments: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  netPayoutAmount: number;

  @Column({ type: "varchar", length: 20, default: OwnerPayoutStatus.DRAFT })
  @Index("idx_owner_payouts_status")
  status: OwnerPayoutStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  transferReference: string | null;

  @Column({ type: "uuid", nullable: true })
  createdByAdminId: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "createdByAdminId" })
  createdByAdmin: UserEntity | null;

  @Column({ type: "uuid", nullable: true })
  approvedByAdminId: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "approvedByAdminId" })
  approvedByAdmin: UserEntity | null;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  paidAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @OneToMany(() => OwnerPayoutItem, (item) => item.payout)
  items: OwnerPayoutItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
