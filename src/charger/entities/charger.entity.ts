import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";
import { ChargerSocket } from "../../owner/entities/charger-socket.entity";
import { BookingMode } from "../enums/booking-mode.enum";
import { ChargerStatus } from "../enums/charger-status.enum";
import type { BookingSettings } from "../interfaces/booking-settings.interface";

@Entity("chargers")
export class Charger {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  ownerId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "ownerId" })
  owner: UserEntity;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  lat: number;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  lng: number;

  // Virtual property for backward compatibility
  get powerKw(): number {
    return this.maxPowerKw;
  }

  set powerKw(value: number) {
    this.maxPowerKw = value;
  }

  @Column({ type: "decimal", precision: 8, scale: 4 })
  pricePerKwh: number;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: "varchar", default: "available" })
  status: "available" | "in-use" | "offline";

  // Charger Type Fields
  @Column({ name: "charger_type", type: "varchar", length: 10 })
  chargerType: "ac" | "dc";

  @Column({ name: "max_power_kw", type: "decimal", precision: 6, scale: 2 })
  maxPowerKw: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  speedType:
    | "ac_slow"
    | "ac_fast"
    | "dc_fast"
    | "dc_rapid"
    | "ultra_rapid"
    | "tesla_supercharger"
    | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  connectorType:
    | "type2"
    | "type1_j1772"
    | "ccs2"
    | "chademo"
    | "tesla_nacs"
    | null;

  @Column({ type: "int", default: 1 })
  numberOfPlugs: number;

  @Column({
    type: "jsonb",
    nullable: true,
    default: { is24Hours: true, schedule: {} },
  })
  openingHours: {
    is24Hours: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  };

  // Access Management Fields
  @Column({ type: "varchar", length: 20, default: "private" })
  accessType: "private" | "public" | "semi-public";

  @Column({ default: true })
  requiresAuth: boolean;

  @Column({ default: false })
  requiresPhysicalCheck: boolean;

  @Column({ type: "int", default: 15 })
  bookingGracePeriod: number;

  @Column({ type: "int", default: 30 })
  autoCancelAfter: number;

  @Column({ type: "timestamp", nullable: true })
  lastPhysicalCheck: Date | null;

  @Column({ default: false })
  hasOccupancySensor: boolean;

  @Column({ default: false })
  manualOverride: boolean;

  @Column({ type: "text", nullable: true })
  publicAccessWarning: string | null;

  // OCPP Integration Fields
  @Column({ type: "varchar", length: 100, nullable: true, unique: true })
  chargeBoxIdentity: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @Column({ type: "varchar", default: "not_configured" })
  ocppStatus: "not_configured" | "pending" | "configured" | "connected";

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastHeartbeat: Date | null;

  // Booking Mode Fields
  @Column({
    name: "booking_mode",
    type: "varchar",
    length: 30,
    default: BookingMode.HYBRID,
  })
  bookingMode: BookingMode;

  @Column({
    name: "booking_settings",
    type: "jsonb",
    default: {
      minBookingMinutes: 30,
      maxBookingMinutes: 180,
      advanceBookingDays: 7,
      gracePeriodMinutes: 10,
      allowSameDayBooking: true,
    },
  })
  bookingSettings: BookingSettings;

  @Column({
    name: "current_status",
    type: "varchar",
    length: 20,
    default: ChargerStatus.AVAILABLE,
  })
  currentStatus: ChargerStatus;

  @Column({
    name: "last_status_update",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  lastStatusUpdate: Date;

  // Payment Account Field
  @Column({ type: "uuid", nullable: true })
  paymentAccountId: string | null;

  // Station Association (for chargers that are part of a station)
  @Column({ name: "station_id", type: "uuid", nullable: true })
  stationId: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  chargerIdentifier: string | null;

  // Contact Information
  @Column({ type: "varchar", length: 20, nullable: true })
  phoneNumber: string | null;

  // Amenities
  @Column({
    type: "jsonb",
    nullable: true,
    default: null,
  })
  amenities: {
    coffee?: boolean;
    restaurant?: boolean;
    parking?: boolean;
    restroom?: boolean;
    wifi?: boolean;
    service?: boolean;
  } | null;

  // Trip Planning Fields
  @Column({ type: "text", nullable: true, name: "google_map_url" })
  googleMapUrl: string | null;

  @Column({
    type: "decimal",
    precision: 4,
    scale: 2,
    default: 0.95,
    name: "reliability_score",
  })
  reliabilityScore: number;

  // Socket Relations
  @OneToMany(() => ChargerSocket, (socket) => socket.charger, { cascade: true })
  sockets: ChargerSocket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
