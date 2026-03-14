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

export enum AdPlacement {
  HOME_BANNER = 'home_banner',
  HOME_NATIVE = 'home_native',
  SEARCH_SPONSORED = 'search_sponsored',
}

export enum AdFormat {
  BANNER = 'banner',
  NATIVE = 'native',
  SPONSORED = 'sponsored',
}

export enum BillingModel {
  CPM = 'cpm',   // Cost per mille (1000 impressions)
  CPC = 'cpc',   // Cost per click
  CPA = 'cpa',   // Cost per action/conversion
  FLAT = 'flat',  // Flat fee for campaign duration
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

  @Column({
    type: 'enum',
    enum: AdPlacement,
    default: AdPlacement.HOME_BANNER,
  })
  placement: AdPlacement;

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
  imageUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  badgeText: string;

  @Column()
  actionUrl: string;

  @Column({ nullable: true })
  deepLink: string;

  @Column({ nullable: true, default: 'Learn More' })
  ctaText: string;

  @Column({ type: 'int', default: 50 })
  priority: number;

  @Column({ nullable: true })
  advertiserName: string;

  @Column({ nullable: true })
  advertiserLogo: string;

  @Column({ type: 'int', default: 0, comment: 'Max impressions per user per day. 0 = unlimited' })
  maxImpressionsPerUserPerDay: number;

  @Column({
    type: 'enum',
    enum: AdFormat,
    default: AdFormat.BANNER,
  })
  adFormat: AdFormat;

  @Column({ type: 'simple-array', nullable: true, comment: 'Days of week: mon,tue,wed,thu,fri,sat,sun. Null = all days' })
  scheduleDays: string[];

  @Column({ type: 'int', nullable: true, comment: 'Start hour (0-23). Null = no time restriction' })
  scheduleHoursStart: number;

  @Column({ type: 'int', nullable: true, comment: 'End hour (0-23). Null = no time restriction' })
  scheduleHoursEnd: number;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  // ── A/B Testing ──────────────────────────────────────────────

  /** The A/B test this variant belongs to (null = not in a test) */
  @Column({ nullable: true })
  abTestId: string;

  /** Variant label within the test (e.g. "A", "B", "Control") */
  @Column({ nullable: true })
  variantLabel: string;

  // ── Audience Targeting ───────────────────────────────────────

  /** Vehicle types to target: car, suv, van, bus, truck, motorbike, threewheel */
  @Column({ type: 'jsonb', nullable: true })
  targetVehicleTypes: string[];

  /** Vehicle makes/brands to target, e.g. ["Tesla", "BYD"] */
  @Column({ type: 'jsonb', nullable: true })
  targetVehicleBrands: string[];

  /** User roles to target: user, owner, mechanic */
  @Column({ type: 'jsonb', nullable: true })
  targetUserRoles: string[];

  /** Minimum days since user registration (new vs existing users) */
  @Column({ type: 'int', nullable: true })
  targetMinAccountAgeDays: number;

  /** Maximum days since user registration */
  @Column({ type: 'int', nullable: true })
  targetMaxAccountAgeDays: number;

  // ── Revenue / Billing ────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: BillingModel,
    default: BillingModel.CPM,
  })
  billingModel: BillingModel;

  /** Rate in dollars: CPM = $/1000 impressions, CPC = $/click, CPA = $/conversion, FLAT = total $ */
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  billingRate: number;

  /** Total budget cap in dollars. 0 = unlimited */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  budgetCap: number;

  /** Running total of spend in dollars */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpend: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
