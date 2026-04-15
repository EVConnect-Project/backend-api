import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StartChargingDto {
  @IsString()
  chargerId: string;

  @IsOptional()
  @IsString()
  chargeBoxIdentity?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  connectorId?: number;

  @IsOptional()
  @IsBoolean()
  lockAmount?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  holdAmount?: number;
}
