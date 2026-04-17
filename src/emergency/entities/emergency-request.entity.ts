import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";
import { MechanicEntity } from "../../mechanics/entities/mechanic.entity";
import { MechanicResponseEntity } from "./mechanic-response.entity";

export type EmergencyStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type ProblemType =
  | "battery_dead"
  | "flat_tire"
  | "engine_issues"
  | "out_of_charge"
  | "overheating"
  | "accident"
  | "locked_out"
  | "other";

@Entity("emergency_requests")
export class EmergencyRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: "text", nullable: true })
  problemDescription: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  problemType: ProblemType;

  @Column({ type: "jsonb", nullable: true })
  vehicleDetails: any;

  @Column({ type: "varchar", length: 20, default: "medium" })
  urgencyLevel: UrgencyLevel;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status: EmergencyStatus;

  @Column({ nullable: true })
  selectedMechanicId: string;

  @ManyToOne(() => MechanicEntity)
  @JoinColumn({ name: "selectedMechanicId" })
  selectedMechanic: MechanicEntity;

  @OneToMany(
    () => MechanicResponseEntity,
    (response) => response.emergencyRequest,
  )
  responses: MechanicResponseEntity[];

  @Column({ type: "jsonb", nullable: true })
  alertedMechanicIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  cancelledAt: Date;

  // Resolution tracking fields
  @Column({ type: "int", nullable: true })
  resolutionTimeMinutes: number;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  userSatisfactionRating: number;

  @Column({ type: "text", nullable: true })
  mechanicFeedback: string;
}
