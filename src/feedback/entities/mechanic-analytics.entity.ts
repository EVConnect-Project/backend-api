import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { MechanicEntity } from "../../mechanics/entities/mechanic.entity";

@Entity("mechanic_analytics")
export class MechanicAnalytics {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => MechanicEntity)
  @JoinColumn({ name: "mechanic_id" })
  mechanic: MechanicEntity;

  @Column({ name: "mechanic_id", unique: true })
  mechanicId: string;

  // Performance metrics
  @Column({ name: "total_completed_jobs", default: 0 })
  totalCompletedJobs: number;

  @Column({ name: "total_cancelled_jobs", default: 0 })
  totalCancelledJobs: number;

  @Column({ name: "total_declined_jobs", default: 0 })
  totalDeclinedJobs: number;

  @Column({
    name: "completion_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 100.0,
  })
  completionRate: number;

  // Rating metrics
  @Column({
    name: "average_overall_rating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  averageOverallRating: number;

  @Column({
    name: "average_response_time_rating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  averageResponseTimeRating: number;

  @Column({
    name: "average_service_quality_rating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  averageServiceQualityRating: number;

  @Column({
    name: "average_professionalism_rating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  averageProfessionalismRating: number;

  @Column({
    name: "average_value_rating",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  averageValueRating: number;

  @Column({ name: "total_ratings", default: 0 })
  totalRatings: number;

  // Time metrics
  @Column({
    name: "average_response_time_minutes",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  averageResponseTimeMinutes: number;

  @Column({
    name: "average_arrival_time_minutes",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  averageArrivalTimeMinutes: number;

  @Column({
    name: "average_service_duration_minutes",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  averageServiceDurationMinutes: number;

  @Column({
    name: "fastest_response_time_minutes",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  fastestResponseTimeMinutes: number;

  // Recommendation metrics
  @Column({
    name: "recommendation_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 100.0,
  })
  recommendationRate: number;

  @Column({
    name: "repeat_customer_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  repeatCustomerRate: number;

  // Issue tracking
  @Column({ name: "total_issues_reported", default: 0 })
  totalIssuesReported: number;

  @Column({ name: "late_arrival_count", default: 0 })
  lateArrivalCount: number;

  @Column({ name: "poor_service_count", default: 0 })
  poorServiceCount: number;

  @Column({ name: "high_price_complaints", default: 0 })
  highPriceComplaints: number;

  @Column({ name: "unprofessional_count", default: 0 })
  unprofessionalCount: number;

  // Revenue metrics
  @Column({
    name: "total_revenue",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  totalRevenue: number;

  @Column({
    name: "average_job_value",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  averageJobValue: number;

  // AI metrics
  @Column({
    name: "ai_recommendation_accuracy",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  aiRecommendationAccuracy: number;

  @Column({
    name: "ai_eta_accuracy",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  aiEtaAccuracy: number;

  @Column({
    name: "last_calculated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
