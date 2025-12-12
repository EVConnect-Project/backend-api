import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Charger } from '../../charger/entities/charger.entity';

@Entity('charging_stations')
export class ChargingStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;

  @Column({ name: 'station_name', type: 'varchar', length: 255 })
  stationName: string;

  @Column({ name: 'location_url', type: 'text' })
  locationUrl: string;

  @Column({ name: 'station_type', type: 'varchar', length: 20, default: 'public' })
  stationType: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'parking_capacity', type: 'int', nullable: true })
  parkingCapacity: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  amenities: string[];

  @Column({ 
    name: 'opening_hours',
    type: 'jsonb',
    nullable: true,
    default: { is24Hours: true, schedule: {} }
  })
  openingHours: {
    is24Hours: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ name: 'access_type', type: 'varchar', length: 20, default: 'public' })
  accessType: 'private' | 'public' | 'semi-public';

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
