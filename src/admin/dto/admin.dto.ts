import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['user', 'admin', 'owner'])
  role: string;
}

export class UpdateChargerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['available', 'in-use', 'offline'])
  status?: string;
}

export class RejectChargerDto {
  @IsString()
  reason: string;
}

export class GetUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class GetChargersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  verified?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
