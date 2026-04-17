import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { EmergencyRequestEntity } from "./emergency-request.entity";
import { MechanicEntity } from "../../mechanics/entities/mechanic.entity";

export type ResponseType = "accepted" | "declined";
export type MechanicStatus =
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "job_complete";

@Entity("mechanic_responses")
export class MechanicResponseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  emergencyRequestId: string;

  @ManyToOne(() => EmergencyRequestEntity, (request) => request.responses)
  @JoinColumn({ name: "emergencyRequestId" })
  emergencyRequest: EmergencyRequestEntity;

  @Column()
  mechanicId: string;

  @ManyToOne(() => MechanicEntity)
  @JoinColumn({ name: "mechanicId" })
  mechanic: MechanicEntity;

  @Column({ type: "varchar", length: 20 })
  responseType: ResponseType;

  @Column({ type: "varchar", length: 20, nullable: true })
  status: MechanicStatus;

  @Column({ type: "integer", nullable: true })
  etaMinutes: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  currentLatitude: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  currentLongitude: number;

  @CreateDateColumn()
  respondedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  statusUpdatedAt: Date;
}
