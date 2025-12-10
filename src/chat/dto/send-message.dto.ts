import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
