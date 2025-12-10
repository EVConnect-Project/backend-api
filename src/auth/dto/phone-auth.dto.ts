import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid international format',
  })
  phoneNumber: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  otp: string;
}

export class RegisterPhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100, {
    message: 'Password must be at least 8 characters long',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  verificationToken: string;
}

export class LoginPhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100, {
    message: 'Password must be at least 8 characters long',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  verificationToken: string;
}
