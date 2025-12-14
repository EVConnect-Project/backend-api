import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { MechanicEntity } from '../../mechanics/entities/mechanic.entity';
import { EmergencyRequestEntity } from '../../emergency/entities/emergency-request.entity';

@Entity('emergency_feedback')
@Unique(['emergencyRequest'])
export class EmergencyFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmergencyRequestEntity)
  @JoinColumn({ name: 'emergency_request_id' })
  emergencyRequest: EmergencyRequestEntity;

  @Column({ name: 'emergency_request_id' })
  emergencyRequestId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => MechanicEntity)
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: MechanicEntity;

  @Column({ name: 'mechanic_id' })
  mechanicId: string;

  // Ratings (1-5)
  @Column({ name: 'overall_rating', type: 'integer' })
  overallRating: number;

  @Column({ name: 'response_time_rating', type: 'integer', nullable: true })
  responseTimeRating: number;

  @Column({ name: 'service_quality_rating', type: 'integer', nullable: true })
  serviceQualityRating: number;

  @Column({ name: 'professionalism_rating', type: 'integer', nullable: true })
  professionalismRating: number;

  @Column({ name: 'value_rating', type: 'integer', nullable: true })
  valueRating: number;

  // Feedback details
  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'positive_aspects', type: 'text', array: true, default: [] })
  positiveAspects: string[];

  @Column({ name: 'negative_aspects', type: 'text', array: true, default: [] })
  negativeAspects: string[];

  @Column({ name: 'would_recommend', default: true })
  wouldRecommend: boolean;

  // Issue tracking
  @Column({ name: 'had_issues', default: false })
  hadIssues: boolean;

  @Column({ name: 'issue_types', type: 'text', array: true, default: [] })
  issueTypes: string[];

  @Column({ name: 'issue_description', type: 'text', nullable: true })
  issueDescription: string;

  // AI feedback
  @Column({ name: 'ai_recommendation_helpful', nullable: true })
  aiRecommendationHelpful: boolean;

  @Column({ name: 'ai_eta_accurate', nullable: true })
  aiEtaAccurate: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
