import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("user_payment_settings")
export class UserPaymentSettingsEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", unique: true })
  userId: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "boolean", default: false })
  autoPayEnabled: boolean;

  @Column({ type: "boolean", default: true })
  saveReceipts: boolean;

  @Column({ type: "boolean", default: true })
  appNotifications: boolean;

  @Column({ type: "boolean", default: true })
  smsNotifications: boolean;

  @Column({ type: "varchar", default: "LKR" })
  currency: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  dailySpendingLimit: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  monthlySpendingLimit: number;

  @Column({ type: "boolean", default: false })
  requirePinForPayments: boolean;

  @Column({ type: "varchar", nullable: true })
  paymentPinHash: string | null; // Hashed PIN for payment verification

  @Column({ type: "boolean", default: true })
  transactionAlerts: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
