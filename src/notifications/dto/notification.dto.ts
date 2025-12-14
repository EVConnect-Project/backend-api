import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsNumber, Min, Max, IsUUID } from 'class-validator';

export class UpdateFcmTokenDto {
  @IsString()
  fcmToken: string;
}

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emergencyAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyEnRoute?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyArrived?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyWorking?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyDelayed?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyCancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  chatNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  chatMechanicTyping?: boolean;

  @IsOptional()
  @IsBoolean()
  promoNewOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  promoDiscounts?: boolean;

  @IsOptional()
  @IsBoolean()
  promoTips?: boolean;

  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  systemMaintenance?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string; // Format: "HH:MM"

  @IsOptional()
  @IsString()
  quietHoursEnd?: string; // Format: "HH:MM"
}

export class MechanicNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emergencyAlertsEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  emergencyAlertRadiusKm?: number;

  @IsOptional()
  @IsBoolean()
  emergencyOnlySpecialization?: boolean;

  @IsOptional()
  @IsBoolean()
  jobAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  jobCancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  jobReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  chatNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  chatUserTyping?: boolean;

  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  performanceReports?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  workingHoursOnly?: boolean;

  @IsOptional()
  @IsString()
  workingHoursStart?: string; // Format: "HH:MM"

  @IsOptional()
  @IsString()
  workingHoursEnd?: string; // Format: "HH:MM"
}

export class SendTestNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

export enum EmergencyNotificationStatus {
  EN_ROUTE = 'en_route',
  ARRIVED = 'arrived',
  WORKING = 'working',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

export class SendEmergencyNotificationDto {
  @IsUUID()
  emergencyId: string;

  @IsUUID()
  mechanicId: string;

  @IsString()
  mechanicName: string;

  @IsEnum(EmergencyNotificationStatus)
  status: EmergencyNotificationStatus;

  @IsOptional()
  @IsNumber()
  eta?: number;

  @IsOptional()
  @IsString()
  problemType?: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
}

export interface NotificationStatsResponse {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
}
