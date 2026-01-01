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
import { MechanicEntity } from '../../mechanics/entities/mechanic.entity';

export enum BreakdownStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

@Entity('emergency_requests')
export class BreakdownRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ nullable: true, name: 'mechanicId' })
  mechanicId: string;

  @ManyToOne(() => MechanicEntity)
  @JoinColumn({ name: 'mechanicId' })
  mechanic: MechanicEntity;

  @Column('decimal', { precision: 10, scale: 7 })
  lat: number;

  @Column('decimal', { precision: 10, scale: 7 })
  lng: number;

  @Column({ nullable: true, name: 'problemType' })
  problemType: string;

  @Column('text', { nullable: true, name: 'problemDescription' })
  problemDescription: string;

  @Column({ nullable: true, name: 'urgencyLevel', default: 'medium' })
  urgencyLevel: string;

  @Column({ nullable: true, name: 'vehicleInfo' })
  vehicleInfo: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true, name: 'userPhone' })
  userPhone: string;

  @Column({ nullable: true, name: 'completionNotes' })
  completionNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'estimatedCost' })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'actualCost' })
  actualCost: number;

  @Column({ nullable: true, name: 'completedAt' })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
