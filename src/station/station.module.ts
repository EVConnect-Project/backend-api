import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Station } from './entities/station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Station])],
  exports: [TypeOrmModule],
})
export class StationModule {}
