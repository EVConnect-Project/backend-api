import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("vehicle_profiles")
export class VehicleProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  user: UserEntity;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  batteryCapacity: number;

  @Column()
  connectorType: string;

  // Normalized array of connector types: type2, ccs2, chademo, type1, ccs1, gb_t_ac, gb_t_dc, tesla, three_phase_type2
  // NOTE: Some deployed DBs don't yet have `connectorTypes` column; keep this
  // as a computed/runtime field to avoid select failures, and derive from
  // connectorType in service/clients when absent.
  connectorTypes?: string[];

  @Column({ nullable: true })
  vehicleType: string; // e.g., 'car', 'motor_bike', 'scooty', 'three_wheel'

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  maxAcChargingPower: number; // kW

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  maxDcChargingPower: number; // kW

  @Column({ type: "decimal", precision: 10, scale: 2 })
  rangeKm: number;

  // Trip Planning: Energy Efficiency Fields
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  averageConsumption: number; // Wh/km - average energy consumption

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  efficiency: number; // km/kWh - efficiency rating

  // Charging curve data for fast charging optimization (JSON)
  @Column({ type: "json", nullable: true })
  chargingCurve: {
    percentage: number; // Battery %
    powerKw: number; // Charging power at this %
  }[];

  // Driving mode preferences
  @Column({ type: "varchar", length: 20, default: "normal" })
  drivingMode: "eco" | "normal" | "sport";

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
