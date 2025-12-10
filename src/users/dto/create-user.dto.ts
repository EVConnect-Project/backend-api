import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['user', 'admin', 'host'])
  role?: string;
}
