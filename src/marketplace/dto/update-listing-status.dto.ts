import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateListingStatusDto {
  @IsEnum(['approved', 'rejected', 'sold'])
  status: 'approved' | 'rejected' | 'sold';

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
