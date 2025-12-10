import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMechanicApplicationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  skills: string;

  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsString()
  @IsNotEmpty()
  serviceArea: string;

  @IsNumber()
  @IsOptional()
  serviceLat?: number;

  @IsNumber()
  @IsOptional()
  serviceLng?: number;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsString()
  @IsOptional()
  additionalInfo?: string;
}
