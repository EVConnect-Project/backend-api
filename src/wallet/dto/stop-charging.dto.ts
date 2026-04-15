import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StopChargingDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitsConsumed?: number;
}
