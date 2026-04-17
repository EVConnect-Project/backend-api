import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
} from "class-validator";
import { AccountType } from "../entities/owner-payment-account.entity";

export class UpdatePaymentAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, {
    message: "IBAN must be in valid format (e.g., GB82WEST12345698765432)",
  })
  iban?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(11)
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: "SWIFT code must be in valid format (e.g., AAAABBCCXXX)",
  })
  swiftCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  routingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchCode?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
