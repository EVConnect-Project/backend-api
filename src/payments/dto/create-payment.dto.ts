import { IsUUID, IsNumber, Min, IsOptional, IsString } from "class-validator";

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
