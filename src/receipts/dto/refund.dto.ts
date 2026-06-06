import { IsOptional, IsString, IsNumber, Min, MaxLength } from "class-validator";

export class RefundPaymentDto {
  /**
   * Optional partial refund amount. When omitted, the full payment amount
   * is refunded.
   */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsString()
  @MaxLength(255)
  reason!: string;
}
