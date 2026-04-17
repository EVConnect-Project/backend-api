import { IsOptional, IsEnum, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class GetAdminListingsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(["pending", "approved", "rejected", "sold"])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
