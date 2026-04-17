import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum AbTestStatus {
  DRAFT = "draft",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
}

@Entity("ab_tests")
@Index(["status"])
export class AbTestEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: AbTestStatus,
    default: AbTestStatus.DRAFT,
  })
  status: AbTestStatus;

  /** Promotion IDs that are part of this test (variant A, B, etc.) */
  @Column({ type: "jsonb", default: [] })
  variantIds: string[];

  /** Traffic split percentages matching variantIds order, must sum to 100 */
  @Column({ type: "jsonb", default: [] })
  trafficSplit: number[];

  /** Labels for each variant (e.g. "Control", "Red CTA", "Short copy") */
  @Column({ type: "jsonb", default: [] })
  variantLabels: string[];

  /** Primary metric to optimise: ctr | conversions | impressions */
  @Column({ default: "ctr" })
  goalMetric: string;

  /** Minimum sample size per variant before winner can be declared */
  @Column({ type: "int", default: 100 })
  minSampleSize: number;

  /** Statistical confidence threshold (0-100, e.g. 95) */
  @Column({ type: "int", default: 95 })
  confidenceThreshold: number;

  /** ID of the winning variant (promotion), set when test completes */
  @Column({ nullable: true })
  winnerId: string;

  @Column({ type: "timestamp", nullable: true })
  startDate: Date;

  @Column({ type: "timestamp", nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
