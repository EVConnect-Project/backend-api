import { IsString, IsEnum, IsOptional, IsArray, IsDateString, IsUrl } from 'class-validator';
import { PromotionType, PromotionStatus } from '../entities/promotion.entity';

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
  badgeText?: string;

  @IsString()
  actionUrl: string;
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
  badgeText?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;
}

export class TrackPromotionDto {
  @IsEnum(['impression', 'click', 'conversion'])
  eventType: 'impression' | 'click' | 'conversion';
}
