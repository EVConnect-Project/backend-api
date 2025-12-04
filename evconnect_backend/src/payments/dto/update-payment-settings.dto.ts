import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @IsBoolean()
  @IsOptional()
  autoPayEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  saveReceipts?: boolean;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  dailySpendingLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlySpendingLimit?: number;

  @IsBoolean()
  @IsOptional()
  requirePinForPayments?: boolean;

  @IsBoolean()
  @IsOptional()
  transactionAlerts?: boolean;
}
