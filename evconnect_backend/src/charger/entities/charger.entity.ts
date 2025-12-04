import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { BookingMode } from '../enums/booking-mode.enum';
import { ChargerStatus } from '../enums/charger-status.enum';
import type { BookingSettings } from '../interfaces/booking-settings.interface';

@Entity('chargers')
export class Charger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  powerKw: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  pricePerKwh: number;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'available' })
  status: 'available' | 'in-use' | 'offline';

  // Charger Type Fields
  @Column({ type: 'varchar', length: 50, nullable: true })
  speedType: 'ac_slow' | 'ac_fast' | 'dc_fast' | 'dc_rapid' | 'ultra_rapid' | 'tesla_supercharger' | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  connectorType: 'type2' | 'type1_j1772' | 'ccs2' | 'chademo' | 'tesla_nacs' | null;

  // Access Management Fields
  @Column({ type: 'varchar', length: 20, default: 'private' })
  accessType: 'private' | 'public' | 'semi-public';

  @Column({ default: true })
  requiresAuth: boolean;

  @Column({ default: false })
  requiresPhysicalCheck: boolean;

  @Column({ type: 'int', default: 15 })
  bookingGracePeriod: number;

  @Column({ type: 'int', default: 30 })
  autoCancelAfter: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPhysicalCheck: Date | null;

  @Column({ default: false })
  hasOccupancySensor: boolean;

  @Column({ default: false })
  manualOverride: boolean;

  @Column({ type: 'text', nullable: true })
  publicAccessWarning: string | null;

  // OCPP Integration Fields
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  chargeBoxIdentity: string;

  @Column({ type: 'varchar', default: 'not_configured' })
  ocppStatus: 'not_configured' | 'pending' | 'configured' | 'connected';

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date | null;

  // Booking Mode Fields
  @Column({ 
    name: 'booking_mode',
    type: 'varchar', 
    length: 30, 
    default: BookingMode.WALK_IN_ONLY 
  })
  bookingMode: BookingMode;

  @Column({ 
    name: 'booking_settings',
    type: 'jsonb',
    default: {
      minBookingMinutes: 30,
      maxBookingMinutes: 180,
      advanceBookingDays: 7,
      gracePeriodMinutes: 10,
      allowSameDayBooking: true
    }
  })
  bookingSettings: BookingSettings;

  @Column({ 
    name: 'current_status',
    type: 'varchar', 
    length: 20, 
    default: ChargerStatus.AVAILABLE 
  })
  currentStatus: ChargerStatus;

  @Column({ 
    name: 'last_status_update',
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  lastStatusUpdate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
