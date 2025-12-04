import { IsBoolean, IsOptional, IsString, IsObject } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  cardholderName?: string;

  @IsObject()
  @IsOptional()
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
