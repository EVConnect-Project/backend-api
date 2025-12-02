import { IsString, IsObject, IsOptional } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
