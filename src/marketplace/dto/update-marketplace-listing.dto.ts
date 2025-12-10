import { PartialType } from '@nestjs/mapped-types';
import { CreateMarketplaceListingDto } from './create-marketplace-listing.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateMarketplaceListingDto extends PartialType(CreateMarketplaceListingDto) {
  @IsEnum(['active', 'sold', 'inactive'])
  @IsOptional()
  status?: string;
}
