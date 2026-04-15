import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChargingModule } from '../charging/charging.module';
import { Charger } from '../charger/entities/charger.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ChargingSessionEntity } from './entities/charging-session.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      ChargingSessionEntity,
      Charger,
      UserEntity,
    ]),
    ConfigModule,
    ChargingModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
