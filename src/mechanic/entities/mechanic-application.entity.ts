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

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('mechanic_applications')
export class MechanicApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  fullName: string;

  @Column()
  phoneNumber: string;

  @Column('text')
  skills: string;

  @Column('int')
  yearsOfExperience: number;

  @Column({ nullable: true })
  certifications: string;

  @Column()
  serviceArea: string; // Geographic area they can cover

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  serviceLat: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  serviceLng: number;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column('text', { nullable: true })
  additionalInfo: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ nullable: true, name: 'reviewed_by' })
  reviewedBy: string;

  @Column({ nullable: true, name: 'review_notes' })
  reviewNotes: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
