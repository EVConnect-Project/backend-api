import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ChargingStation } from "../../owner/entities/charging-station.entity";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("service_station_bookings")
export class ServiceStationBookingEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "station_id", type: "uuid" })
  stationId: string;

  @ManyToOne(() => ChargingStation)
  @JoinColumn({ name: "station_id" })
  station: ChargingStation;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column({ name: "appointment_date", type: "date" })
  appointmentDate: string;

  @Column({ name: "slot_time", type: "varchar", length: 5 })
  slotTime: string;

  @Column({ name: "service_type", type: "varchar", length: 80 })
  serviceType: string;

  @Column({ name: "status", type: "varchar", length: 24, default: "confirmed" })
  status: string;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date | null;

  @Column({ name: "rating", type: "int", nullable: true })
  rating: number | null;

  @Column({ name: "feedback", type: "text", nullable: true })
  feedback: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
