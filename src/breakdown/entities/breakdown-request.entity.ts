import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum BreakdownStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

@Entity('breakdown_requests')
export class BreakdownRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ nullable: true, name: 'mechanic_id' })
  mechanicId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: UserEntity;

  @Column('decimal', { precision: 10, scale: 7 })
  lat: number;

  @Column('decimal', { precision: 10, scale: 7 })
  lng: number;

  @Column({ nullable: true })
  address: string;

  @Column('text')
  issueDescription: string;

  @Column({ nullable: true })
  vehicleInfo: string;

  @Column({
    type: 'enum',
    enum: BreakdownStatus,
    default: BreakdownStatus.PENDING,
  })
  status: BreakdownStatus;

  @Column({ nullable: true })
  mechanicNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualCost: number;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
