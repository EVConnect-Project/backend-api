import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

// Retained for callers that still import these enums; the slimmer DB
// schema only stores a `verified` boolean, so the enum values exist for
// API-contract continuity but are not persisted to columns of their own.
export enum AccountType {
  SAVINGS = "savings",
  CHECKING = "checking",
  BUSINESS = "business",
}

export enum VerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

// The deployed `owner_payment_accounts` table was created by the
// ensure-all-tables bootstrap script with these columns:
//   id, ownerId, accountHolderName, bankName, accountNumber,
//   branchCode, isPrimary, verified, createdAt, updatedAt
// All @Column names are pinned explicitly so the SnakeNamingStrategy
// doesn't rewrite them to snake_case.
@Entity("owner_payment_accounts")
export class OwnerPaymentAccount {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ownerId", type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "ownerId" })
  user: UserEntity;

  @Column({ name: "accountHolderName", type: "varchar", length: 255 })
  accountHolderName: string;

  @Column({ name: "bankName", type: "varchar", length: 255 })
  bankName: string;

  @Column({ name: "accountNumber", type: "varchar", length: 100 })
  accountNumber: string;

  @Column({ name: "branchCode", type: "varchar", length: 100, nullable: true })
  branchCode: string | null;

  @Column({ name: "isPrimary", default: false })
  isPrimary: boolean;

  @Column({ name: "verified", default: false })
  verified: boolean;

  @CreateDateColumn({ name: "createdAt" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt: Date;
}
