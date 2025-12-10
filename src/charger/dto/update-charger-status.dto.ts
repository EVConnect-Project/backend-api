import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChargerStatus } from '../enums/charger-status.enum';

export class UpdateChargerStatusDto {
  @IsEnum(ChargerStatus)
  @IsNotEmpty()
  status: ChargerStatus;
}
