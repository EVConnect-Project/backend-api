import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";
import { VehicleProfile } from "../../auth/entities/vehicle-profile.entity";

@Entity("trip_plans")
export class TripPlanEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "uuid", nullable: true, name: "vehicleProfileId" })
  vehicleId: string;

  @ManyToOne(() => VehicleProfile, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "vehicleProfileId" })
  vehicle: VehicleProfile;

  // Start location
  @Column({ type: "decimal", precision: 10, scale: 7, name: "origin_lat" })
  startLat: number;

  @Column({ type: "decimal", precision: 10, scale: 7, name: "origin_lng" })
  startLng: number;

  // Transient property - not persisted in database
  startAddress: string;

  // Destination
  @Column({ type: "decimal", precision: 10, scale: 7, name: "destination_lat" })
  destLat: number;

  @Column({ type: "decimal", precision: 10, scale: 7, name: "destination_lng" })
  destLng: number;

  // Transient property - not persisted in database
  destAddress: string;

  // Waypoints (JSON array) - not persisted
  waypoints: { lat: number; lng: number; address?: string }[];

  // Route summary - not persisted
  totalDistanceKm: number;

  totalDurationMinutes: number;

  drivingDurationMinutes: number;

  totalChargingTimeMinutes: number;

  totalChargingCostLkr: number;

  routeScore: number;

  @Column({ type: "jsonb", nullable: true, name: "route_data" })
  routePolyline: string;

  routeSummary: string;

  drivingMode: string;

  startBatteryPercent: number;

  arrivalBatteryPercent: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true, name: "currentLat" })
  currentLat?: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true, name: "currentLng" })
  currentLng?: number;

  @Column({ type: "decimal", precision: 6, scale: 2, nullable: true, name: "currentHeading" })
  currentHeading?: number;

  @Column({ type: "decimal", precision: 7, scale: 2, nullable: true, name: "currentSpeedKph" })
  currentSpeedKph?: number;

  @Column({ type: "timestamp", nullable: true, name: "lastLocationAt" })
  lastLocationAt?: Date;

  // Charging stops (JSON array for simplicity) - transient property
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

  // Safety warnings (JSON array) - transient property
  safetyWarnings: {
    type: string;
    severity: string;
    message: string;
  }[];

  @Column({
    type: "varchar",
    length: 20,
    default: "planned",
    name: "status"
  })
  status: "planned" | "active" | "completed" | "cancelled";

  @Column({ type: "int", nullable: true, name: "startBatteryLevel" })
  startBatteryLevel?: number;

  @Column({ type: "int", nullable: true, name: "targetArrivalBattery" })
  targetArrivalBattery?: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, name: "totalDistance" })
  totalDistance?: number;

  @Column({ type: "int", nullable: true, name: "estimatedDuration" })
  estimatedDuration?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
