import { IsNotEmpty, IsString } from 'class-validator';
import { IsEmailOrPhone } from '../validators/email-or-phone.validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsEmailOrPhone()
  email: string; // Can be email or phone number

  @IsString()
  @IsNotEmpty()
  password: string;
}
