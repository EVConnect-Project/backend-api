import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ReportCategory } from '../entities/support-report.entity';

export class CreateReportDto {
  @IsEnum(ReportCategory)
  @IsNotEmpty()
  category: ReportCategory;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
