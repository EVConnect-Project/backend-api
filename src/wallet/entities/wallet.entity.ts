import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  // Held amount is not spendable until the charging session settles.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  heldBalance: number;

  @Column({ type: 'varchar', length: 10, default: 'LKR' })
  currency: string;

  @Column({ type: 'boolean', default: false })
  autoTopupEnabled: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  autoTopupThreshold: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  autoTopupAmount: number | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
