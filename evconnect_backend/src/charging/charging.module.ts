import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChargingController } from './charging.controller';
import { ChargingService } from './charging.service';

@Module({
  imports: [HttpModule],
  controllers: [ChargingController],
  providers: [ChargingService],
  exports: [ChargingService],
})
export class ChargingModule {}
