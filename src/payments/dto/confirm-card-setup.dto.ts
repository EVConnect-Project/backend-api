import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmCardSetupDto {
  @IsString()
  @IsNotEmpty()
  setupId: string;

  @IsNumber()
  expiresAt: number;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  lastFour: string;

  @IsString()
  @IsNotEmpty()
  expiryMonth: string;

  @IsString()
  @IsNotEmpty()
  expiryYear: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  cardholderName?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
