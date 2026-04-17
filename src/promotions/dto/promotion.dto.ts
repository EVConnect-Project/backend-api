import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import {
  PromotionType,
  PromotionStatus,
  AdPlacement,
  AdFormat,
  BillingModel,
} from "../entities/promotion.entity";
import { AbTestStatus } from "../entities/ab-test.entity";

export class CreatePromotionDto {
  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsEnum(PromotionStatus)
  @IsOptional()
  status?: PromotionStatus;

  @IsEnum(AdPlacement)
  @IsOptional()
  placement?: AdPlacement;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetAudience?: string[];

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gradientColors?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  actionUrl: string;

  @IsString()
  @IsOptional()
  deepLink?: string;

  @IsString()
  @IsOptional()
  ctaText?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  advertiserName?: string;

  @IsString()
  @IsOptional()
  advertiserLogo?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxImpressionsPerUserPerDay?: number;

  @IsEnum(AdFormat)
  @IsOptional()
  adFormat?: AdFormat;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scheduleDays?: string[];

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  scheduleHoursStart?: number;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  scheduleHoursEnd?: number;

  // A/B Testing
  @IsString()
  @IsOptional()
  abTestId?: string;

  @IsString()
  @IsOptional()
  variantLabel?: string;

  // Audience Targeting
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetVehicleTypes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetVehicleBrands?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetUserRoles?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMinAccountAgeDays?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMaxAccountAgeDays?: number;

  // Billing
  @IsEnum(BillingModel)
  @IsOptional()
  billingModel?: BillingModel;

  @IsNumber()
  @Min(0)
  @IsOptional()
  billingRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetCap?: number;
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

  @IsEnum(PromotionStatus)
  @IsOptional()
  status?: PromotionStatus;

  @IsEnum(AdPlacement)
  @IsOptional()
  placement?: AdPlacement;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetAudience?: string[];

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gradientColors?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  deepLink?: string;

  @IsString()
  @IsOptional()
  ctaText?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  advertiserName?: string;

  @IsString()
  @IsOptional()
  advertiserLogo?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxImpressionsPerUserPerDay?: number;

  @IsEnum(AdFormat)
  @IsOptional()
  adFormat?: AdFormat;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scheduleDays?: string[];

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  scheduleHoursStart?: number;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  scheduleHoursEnd?: number;

  // A/B Testing
  @IsString()
  @IsOptional()
  abTestId?: string;

  @IsString()
  @IsOptional()
  variantLabel?: string;

  // Audience Targeting
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetVehicleTypes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetVehicleBrands?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetUserRoles?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMinAccountAgeDays?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetMaxAccountAgeDays?: number;

  // Billing
  @IsEnum(BillingModel)
  @IsOptional()
  billingModel?: BillingModel;

  @IsNumber()
  @Min(0)
  @IsOptional()
  billingRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetCap?: number;
}

export class TrackPromotionDto {
  @IsEnum(["impression", "click", "conversion", "dismiss"])
  eventType: "impression" | "click" | "conversion" | "dismiss";

  @IsString()
  @IsOptional()
  placement?: string;
}

// ── A/B Test DTOs ────────────────────────────────────────────

export class CreateAbTestDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  variantIds: string[];

  @IsArray()
  trafficSplit: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variantLabels?: string[];

  @IsString()
  @IsOptional()
  goalMetric?: string;

  @IsInt()
  @Min(10)
  @IsOptional()
  minSampleSize?: number;

  @IsInt()
  @Min(50)
  @Max(99)
  @IsOptional()
  confidenceThreshold?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class UpdateAbTestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AbTestStatus)
  @IsOptional()
  status?: AbTestStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variantIds?: string[];

  @IsArray()
  @IsOptional()
  trafficSplit?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variantLabels?: string[];

  @IsString()
  @IsOptional()
  goalMetric?: string;

  @IsInt()
  @Min(10)
  @IsOptional()
  minSampleSize?: number;

  @IsInt()
  @Min(50)
  @Max(99)
  @IsOptional()
  confidenceThreshold?: number;

  @IsString()
  @IsOptional()
  winnerId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
