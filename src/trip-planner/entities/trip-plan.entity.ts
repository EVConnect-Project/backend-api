import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { VehicleProfile } from '../../auth/entities/vehicle-profile.entity';

@Entity('trip_plans')
export class TripPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => VehicleProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: VehicleProfile;

  // Start location
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLng: number;

  @Column({ nullable: true })
  startAddress: string;

  // Destination
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destLng: number;

  @Column({ nullable: true })
  destAddress: string;

  // Waypoints (JSON array)
  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  waypoints: { lat: number; lng: number; address?: string }[];

  // Route summary
  @Column({ type: 'decimal', precision: 8, scale: 1 })
  totalDistanceKm: number;

  @Column({ type: 'int' })
  totalDurationMinutes: number;

  @Column({ type: 'int' })
  drivingDurationMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalChargingTimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalChargingCostLkr: number;

  @Column({ type: 'int' })
  routeScore: number;

  @Column({ type: 'text', nullable: true })
  routePolyline: string;

  @Column({ nullable: true })
  routeSummary: string;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  drivingMode: string;

  @Column({ type: 'int', default: 80 })
  startBatteryPercent: number;

  @Column({ type: 'int', default: 0 })
  arrivalBatteryPercent: number;

  // Charging stops (JSON array for simplicity)
  @Column({ type: 'jsonb', default: '[]' })
  chargingStops: {
    chargerId: string;
    chargerName: string;
    lat: number;
    lng: number;
    address?: string;
    distanceFromStart: number;
    arrivalBatteryPercent: number;
    departureBatteryPercent: number;
    chargingTimeMinutes: number;
    chargingPowerKw: number;
    estimatedCostLkr: number;
    connectorType: string;
    chargerType: string;
  }[];

  // Safety warnings (JSON array)
  @Column({ type: 'jsonb', default: '[]' })
  safetyWarnings: {
    type: string;
    severity: string;
    message: string;
  }[];

  @Column({
    type: 'varchar',
    length: 20,
    default: 'planned',
  })
  status: 'planned' | 'active' | 'completed' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
