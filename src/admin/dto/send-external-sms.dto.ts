import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SendExternalSmsDto {
  @IsString()
  @Transform(({ value }) =>
    value
      ?.toString()
      .trim()
      .replace(/[\s()-]/g, ""),
  )
  @Matches(/^(?:\+94|94|0)?7\d{8}$/, {
    message: "phoneNumber must be a valid Sri Lankan mobile number",
  })
  phoneNumber: string;

  @IsString()
  @Transform(({ value }) =>
    value
      ?.toString()
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, ""),
  )
  @MinLength(3)
  @MaxLength(480)
  message: string;
}
