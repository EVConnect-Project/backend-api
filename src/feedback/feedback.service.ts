import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyFeedback } from './entities/emergency-feedback.entity';
import { MechanicAnalytics } from './entities/mechanic-analytics.entity';
import { SubmitFeedbackDto, FeedbackResponseDto, MechanicPerformanceDto } from './dto/feedback.dto';
import { EmergencyRequestEntity } from '../emergency/entities/emergency-request.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(EmergencyFeedback)
    private feedbackRepository: Repository<EmergencyFeedback>,
    @InjectRepository(MechanicAnalytics)
    private analyticsRepository: Repository<MechanicAnalytics>,
    @InjectRepository(EmergencyRequestEntity)
    private emergencyRepository: Repository<EmergencyRequestEntity>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
  ) {}

  async submitFeedback(userId: string, dto: SubmitFeedbackDto): Promise<FeedbackResponseDto> {
    // Verify emergency request exists and belongs to user
    const emergency = await this.emergencyRepository.findOne({
      where: { id: dto.emergencyId, userId },
      relations: ['mechanic'],
    });

    if (!emergency) {
      throw new NotFoundException('Emergency request not found');
    }

    if (emergency.status !== 'completed') {
      throw new BadRequestException('Can only provide feedback for completed emergencies');
    }

    // Check if feedback already exists
    const existingFeedback = await this.feedbackRepository.findOne({
      where: { emergencyRequestId: dto.emergencyId },
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback already submitted for this emergency');
    }

    // Create feedback
    const feedback = this.feedbackRepository.create({
      emergencyRequestId: dto.emergencyId,
      userId,
      mechanicId: dto.mechanicId,
      overallRating: dto.overallRating,
      responseTimeRating: dto.responseTimeRating,
      serviceQualityRating: dto.serviceQualityRating,
      professionalismRating: dto.professionalismRating,
      valueRating: dto.valueRating,
      comment: dto.comment,
      positiveAspects: dto.positiveAspects || [],
      negativeAspects: dto.negativeAspects || [],
      wouldRecommend: dto.wouldRecommend ?? true,
      hadIssues: dto.hadIssues ?? false,
      issueTypes: dto.issueTypes || [],
      issueDescription: dto.issueDescription,
      aiRecommendationHelpful: dto.aiRecommendationHelpful,
      aiEtaAccurate: dto.aiEtaAccurate,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    return {
      id: savedFeedback.id,
      emergencyRequestId: savedFeedback.emergencyRequestId,
      overallRating: savedFeedback.overallRating,
      comment: savedFeedback.comment,
      createdAt: savedFeedback.createdAt,
    };
  }

  async getFeedbackForEmergency(emergencyId: string): Promise<EmergencyFeedback | null> {
    return this.feedbackRepository.findOne({
      where: { emergencyRequestId: emergencyId },
      relations: ['user', 'mechanic'],
    });
  }

  async getMechanicFeedbacks(mechanicId: string, limit = 10): Promise<EmergencyFeedback[]> {
    return this.feedbackRepository.find({
      where: { mechanicId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async getMechanicPerformance(mechanicId: string): Promise<MechanicPerformanceDto> {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    const analytics = await this.analyticsRepository.findOne({
      where: { mechanicId },
    });

    if (!analytics) {
      // Return default analytics if none exist
      return {
        mechanicId,
        mechanicName: mechanic.name,
        totalJobs: 0,
        completedJobs: 0,
        completionRate: 100,
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: {
          overall: 0,
          responseTime: 0,
          serviceQuality: 0,
          professionalism: 0,
          value: 0,
        },
        averageResponseTime: 'N/A',
        averageArrivalTime: 'N/A',
        fastestResponseTime: 'N/A',
        recommendationRate: 100,
        totalIssues: 0,
        issueBreakdown: {
          lateArrival: 0,
          poorService: 0,
          highPrice: 0,
          unprofessional: 0,
        },
      };
    }

    return {
      mechanicId,
      mechanicName: mechanic.name,
      totalJobs: analytics.totalCompletedJobs + analytics.totalCancelledJobs,
      completedJobs: analytics.totalCompletedJobs,
      completionRate: Number(analytics.completionRate),
      averageRating: analytics.averageOverallRating ? Number(analytics.averageOverallRating) : 0,
      totalRatings: analytics.totalRatings,
      ratingBreakdown: {
        overall: analytics.averageOverallRating ? Number(analytics.averageOverallRating) : 0,
        responseTime: analytics.averageResponseTimeRating ? Number(analytics.averageResponseTimeRating) : 0,
        serviceQuality: analytics.averageServiceQualityRating ? Number(analytics.averageServiceQualityRating) : 0,
        professionalism: analytics.averageProfessionalismRating ? Number(analytics.averageProfessionalismRating) : 0,
        value: analytics.averageValueRating ? Number(analytics.averageValueRating) : 0,
      },
      averageResponseTime: analytics.averageResponseTimeMinutes
        ? this.formatMinutes(Number(analytics.averageResponseTimeMinutes))
        : 'N/A',
      averageArrivalTime: analytics.averageArrivalTimeMinutes
        ? this.formatMinutes(Number(analytics.averageArrivalTimeMinutes))
        : 'N/A',
      fastestResponseTime: analytics.fastestResponseTimeMinutes
        ? this.formatMinutes(Number(analytics.fastestResponseTimeMinutes))
        : 'N/A',
      recommendationRate: Number(analytics.recommendationRate),
      totalIssues: analytics.totalIssuesReported,
      issueBreakdown: {
        lateArrival: analytics.lateArrivalCount,
        poorService: analytics.poorServiceCount,
        highPrice: analytics.highPriceComplaints,
        unprofessional: analytics.unprofessionalCount,
      },
    };
  }

  async getTopRatedMechanics(limit = 10): Promise<MechanicAnalytics[]> {
    return this.analyticsRepository.find({
      where: { totalRatings: 5 }, // At least 5 ratings
      order: { averageOverallRating: 'DESC' },
      take: limit,
      relations: ['mechanic'],
    });
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
