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

export enum ReportStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum ReportCategory {
  TECHNICAL_ISSUE = "Technical Issue",
  PAYMENT_PROBLEM = "Payment Problem",
  CHARGER_ISSUE = "Charger Issue",
  ACCOUNT_PROBLEM = "Account Problem",
  BOOKING_ISSUE = "Booking Issue",
  APP_PERFORMANCE = "App Performance",
  OTHER = "Other",
}

@Entity("support_reports")
export class SupportReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: ReportCategory,
  })
  category: ReportCategory;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({
    type: "enum",
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: "text", nullable: true })
  adminResponse: string;

  @Column({ type: "uuid", nullable: true })
  userId: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "uuid", nullable: true })
  respondedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date;
}
