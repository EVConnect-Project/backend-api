import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreakdownService } from './breakdown.service';
import { BreakdownController } from './breakdown.controller';
import { BreakdownRequest } from './entities/breakdown-request.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MechanicApplication } from '../mechanic/entities/mechanic-application.entity';
import { MechanicAccessGuard } from './guards/mechanic-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BreakdownRequest, UserEntity, MechanicApplication])],
  providers: [BreakdownService, MechanicAccessGuard],
  controllers: [BreakdownController],
  exports: [BreakdownService],
})
export class BreakdownModule {}
