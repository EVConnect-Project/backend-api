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
  cardBrand: string; // visa, mastercard, amex

  @Column({ nullable: true })
  lastFour: string; // Last 4 digits of card

  @Column({ nullable: true })
  expiryMonth: string;

  @Column({ nullable: true })
  expiryYear: string;

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

  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON string for additional details

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
