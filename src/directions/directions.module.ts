import { Module } from '@nestjs/common';
import { DirectionsController } from './directions.controller';

@Module({
  controllers: [DirectionsController],
})
export class DirectionsModule {}
