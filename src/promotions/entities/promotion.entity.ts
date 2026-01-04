import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PromotionType {
  CHARGER_DISCOUNT = 'charger_discount',
  BRAND_PARTNERSHIP = 'brand_partnership',
  MARKETPLACE_DEAL = 'marketplace_deal',
  SERVICE_OFFER = 'service_offer',
  LOCAL_BUSINESS = 'local_business',
}

export enum PromotionStatus {
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
  DRAFT = 'draft',
}

@Entity('promotions')
export class PromotionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  subtitle: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PromotionType,
    default: PromotionType.CHARGER_DISCOUNT,
  })
  type: PromotionType;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.DRAFT,
  })
  status: PromotionStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'jsonb', default: [] })
  targetAudience: string[];

  @Column({ default: 'electric_bolt' })
  iconName: string;

  @Column({ type: 'jsonb', default: ['#1E4DB7', '#2F6FED'] })
  gradientColors: string[];

  @Column({ nullable: true })
  badgeText: string;

  @Column()
  actionUrl: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
