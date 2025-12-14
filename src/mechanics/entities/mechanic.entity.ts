import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('mechanics')
export class MechanicEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  @Column({ type: 'text', array: true, default: '{}' })
  services: string[]; // e.g., ['tire-change', 'battery-jump', 'towing', 'repair']

  @Column({ nullable: true })
  specialization: string;

  @Column({ name: 'yearsofexperience', type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  available: boolean;

  @Column({ name: 'isbanned', default: false })
  isBanned: boolean;

  @Column({ name: 'priceperhour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerHour: number;

  @Column({ name: 'completedjobs', type: 'int', default: 0 })
  completedJobs: number;

  @Column({ name: 'licensenumber', nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  certifications: string;

  @Column({ name: 'currentlocationlat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLocationLat: number;

  @Column({ name: 'currentlocationlng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLocationLng: number;

  @Column({ name: 'isonjob', type: 'boolean', default: false })
  isOnJob: boolean;

  @Column({ name: 'lastonlineat', type: 'timestamp', nullable: true })
  lastOnlineAt: Date;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
