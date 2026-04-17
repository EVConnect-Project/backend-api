import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(["male", "female"])
  gender?: string;
}
