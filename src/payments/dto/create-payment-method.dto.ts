import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
} from "class-validator";
import { PaymentMethodType } from "../entities/payment-method.entity";

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsNotEmpty()
  lastFour: string;

  @IsString()
  @IsNotEmpty()
  expiryMonth: string;

  @IsString()
  @IsNotEmpty()
  expiryYear: string;

  @IsString()
  @IsOptional()
  cardholderName?: string;

  @IsString()
  @IsNotEmpty()
  token: string; // Payment gateway token

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

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
