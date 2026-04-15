import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum PaymentMethodType {
  CARD = 'card',
  WALLET = 'wallet',
  BANK = 'bank',
}

@Entity('payment_methods')
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    default: PaymentMethodType.CARD,
  })
  type: PaymentMethodType;

  @Column({ nullable: true })
  stripePaymentMethodId: string; // Stripe payment method ID (legacy)

  @Column({ nullable: true })
  brand: string; // Card brand (legacy column - same as cardBrand)

  @Column({ nullable: true })
  cardBrand: string; // visa, mastercard, amex

  @Column({ nullable: true })
  lastFour: string; // Last 4 digits of card

  @Column({ type: 'integer', nullable: true })
  expiryMonth: number;

  @Column({ type: 'integer', nullable: true })
  expiryYear: number;

  @Column({ nullable: true })
  cardholderName: string;

  @Column({ nullable: true })
  token: string; // Payment gateway token (PayHere, Stripe)

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  billingAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional details as JSON (can store billing address here)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
