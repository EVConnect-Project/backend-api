import { IsUUID } from "class-validator";

export class CreateChatDto {
  @IsUUID()
  listingId: string;

  @IsUUID()
  sellerId: string;
}
