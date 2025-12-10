import { IsString, IsEnum, IsOptional } from 'class-validator';

export class SaveFcmTokenDto {
  @IsString()
  fcmToken: string;

  @IsEnum(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  deviceId?: string;
}
