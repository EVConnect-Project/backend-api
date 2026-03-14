import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { EmergencyFeedback } from './entities/emergency-feedback.entity';
import { MechanicAnalytics } from './entities/mechanic-analytics.entity';
import { EmergencyRequestEntity } from '../emergency/entities/emergency-request.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyFeedback,
      MechanicAnalytics,
      EmergencyRequestEntity,
      MechanicEntity,
    ]),
  ],
  providers: [FeedbackService],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
