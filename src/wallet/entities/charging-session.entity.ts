import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum ChargingSessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('wallet_charging_sessions')
export class ChargingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  sessionId: string;

  @Column({ type: 'uuid' })
  @Index('idx_wallet_charging_sessions_user_id')
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 120 })
  chargerId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  externalSessionId: string | null;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  unitsConsumed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pricePerKwh: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  heldAmount: number;

  @Column({
    type: 'enum',
    enum: ChargingSessionStatus,
    default: ChargingSessionStatus.ACTIVE,
  })
  @Index('idx_wallet_charging_sessions_status')
  status: ChargingSessionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
