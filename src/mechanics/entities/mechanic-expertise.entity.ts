import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { MechanicEntity } from "./mechanic.entity";

@Entity("mechanic_expertise")
export class MechanicExpertiseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "mechanicId" })
  mechanicId: string;

  @ManyToOne(() => MechanicEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mechanicId" })
  mechanic: MechanicEntity;

  @Column({ name: "problemType", length: 50 })
  problemType: string; // e.g., 'battery_dead', 'flat_tire', 'engine_issues', etc.

  @Column({ name: "jobsCompleted", type: "int", default: 0 })
  jobsCompleted: number;

  @Column({ name: "jobsSuccessful", type: "int", default: 0 })
  jobsSuccessful: number;

  @Column({ name: "avgResolutionMinutes", type: "int", nullable: true })
  avgResolutionMinutes: number;

  @Column({
    name: "avgSatisfactionRating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  avgSatisfactionRating: number;

  @Column({ name: "lastJobAt", type: "timestamp", nullable: true })
  lastJobAt: Date;

  @CreateDateColumn({ name: "createdAt" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt: Date;

  // Calculated property: success rate
  get successRate(): number {
    if (this.jobsCompleted === 0) return 0;
    return this.jobsSuccessful / this.jobsCompleted;
  }
}
