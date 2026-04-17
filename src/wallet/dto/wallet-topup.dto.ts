import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class WalletTopupDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsOptional()
  @IsString()
  callbackContext?: string;
}
