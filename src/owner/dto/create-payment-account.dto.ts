import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";
import { AccountType } from "../entities/owner-payment-account.entity";

export class CreatePaymentAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bankName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  accountNumber: string;

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

  @IsEnum(AccountType)
  accountType: AccountType;
}
