import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('service_station_applications')
export class ServiceStationApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'station_name', type: 'varchar', length: 255 })
  stationName: string;

  @Column({ name: 'location_url', type: 'text' })
  locationUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'city', type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 24, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'service_categories', type: 'jsonb', default: [] })
  serviceCategories: string[];

  @Column({ type: 'jsonb', default: [] })
  amenities: string[];

  @Column({
    name: 'opening_hours',
    type: 'jsonb',
    nullable: true,
    default: { is24Hours: true, schedule: {} },
  })
  openingHours: {
    is24Hours: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({
    name: 'application_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  applicationStatus: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
