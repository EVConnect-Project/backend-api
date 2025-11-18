import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { BreakdownStatus } from '../entities/breakdown-request.entity';

export class UpdateBreakdownStatusDto {
  @IsEnum(BreakdownStatus)
  @IsOptional()
  status?: BreakdownStatus;

  @IsString()
  @IsOptional()
  mechanicNotes?: string;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @IsNumber()
  @IsOptional()
  actualCost?: number;
}
