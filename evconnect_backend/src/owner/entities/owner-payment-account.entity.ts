import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum AccountType {
  SAVINGS = 'savings',
  CHECKING = 'checking',
  BUSINESS = 'business'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

@Entity('owner_payment_accounts')
export class OwnerPaymentAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 255 })
  bankName: string;

  @Column({ type: 'varchar', length: 100 })
  accountNumber: string;

  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  swiftCode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  routingNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branchCode: string | null;

  @Column({ 
    type: 'enum',
    enum: AccountType,
    default: AccountType.SAVINGS
  })
  accountType: AccountType;

  @Column({ 
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING
  })
  verificationStatus: VerificationStatus;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
