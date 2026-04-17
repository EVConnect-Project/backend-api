import { IsEnum, IsString, IsOptional } from "class-validator";
import { ReportStatus } from "../entities/support-report.entity";

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsString()
  @IsOptional()
  adminResponse?: string;
}
