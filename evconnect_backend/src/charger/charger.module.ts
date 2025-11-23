import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargerService } from './charger.service';
import { ChargerController } from './charger.controller';
import { Charger } from './entities/charger.entity';
import { AuthModule } from '../auth/auth.module';
import { ChargerIntegrationModule } from '../charger-integration/charger-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Charger]),
    AuthModule,
    forwardRef(() => ChargerIntegrationModule),
  ],
  controllers: [ChargerController],
  providers: [ChargerService],
  exports: [ChargerService],
})
export class ChargerModule {}
