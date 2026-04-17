import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApplicationStatus } from "../entities/mechanic-application.entity";

export class ReviewApplicationDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
