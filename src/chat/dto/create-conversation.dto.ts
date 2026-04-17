import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
} from "class-validator";
import { ConversationType } from "../entities/conversation.entity";

export class CreateConversationDto {
  @IsEnum(ConversationType)
  @IsNotEmpty()
  type: ConversationType;

  @IsUUID()
  @IsNotEmpty()
  participantId: string;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  initialMessage?: string;
}
