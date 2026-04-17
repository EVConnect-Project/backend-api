import { IsString, IsOptional } from "class-validator";

export class UploadImageDto {
  @IsOptional()
  @IsString()
  folder?: string;
}
