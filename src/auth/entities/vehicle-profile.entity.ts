import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('vehicle_profiles')
export class VehicleProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  batteryCapacity: number;

  @Column()
  connectorType: string;

  @Column({ nullable: true })
  vehicleType: string; // e.g., 'car', 'suv', 'van', 'bus', 'motorbike', 'scooty', 'threewheel', 'truck'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rangeKm: number;

  // Trip Planning: Energy Efficiency Fields
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  averageConsumption: number; // Wh/km - average energy consumption

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  efficiency: number; // km/kWh - efficiency rating

  // Charging curve data for fast charging optimization (JSON)
  @Column({ type: 'json', nullable: true })
  chargingCurve: {
    percentage: number; // Battery %
    powerKw: number; // Charging power at this %
  }[];

  // Driving mode preferences
  @Column({ type: 'varchar', length: 20, default: 'normal' })
  drivingMode: 'eco' | 'normal' | 'sport';

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
