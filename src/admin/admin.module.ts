import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Charger])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
