import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargerService } from './charger.service';
import { ChargerController } from './charger.controller';
import { Charger } from './entities/charger.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Charger]),
    AuthModule,
  ],
  controllers: [ChargerController],
  providers: [ChargerService],
  exports: [ChargerService],
})
export class ChargerModule {}
