import {
  IsInt,
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  emergencyId: string;

  @IsString()
  mechanicId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  responseTimeRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  serviceQualityRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  professionalismRating?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  valueRating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  positiveAspects?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  negativeAspects?: string[];

  @IsBoolean()
  @IsOptional()
  wouldRecommend?: boolean;

  @IsBoolean()
  @IsOptional()
  hadIssues?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  issueTypes?: string[];

  @IsString()
  @IsOptional()
  issueDescription?: string;

  @IsBoolean()
  @IsOptional()
  aiRecommendationHelpful?: boolean;

  @IsBoolean()
  @IsOptional()
  aiEtaAccurate?: boolean;
}

export class FeedbackResponseDto {
  id: string;
  emergencyRequestId: string;
  overallRating: number;
  comment?: string;
  createdAt: Date;
}

export class MechanicAnalyticsDto {
  mechanicId: string;
  mechanicName: string;
  totalCompletedJobs: number;
  averageOverallRating?: number;
  totalRatings: number;
  averageResponseTimeMinutes?: number;
  averageArrivalTimeMinutes?: number;
  completionRate: number;
  recommendationRate: number;
  totalIssuesReported: number;
}

export class MechanicPerformanceDto {
  mechanicId: string;
  mechanicName: string;
  
  // Performance
  totalJobs: number;
  completedJobs: number;
  completionRate: number;
  
  // Ratings
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    overall: number;
    responseTime: number;
    serviceQuality: number;
    professionalism: number;
    value: number;
  };
  
  // Time metrics
  averageResponseTime: string;
  averageArrivalTime: string;
  fastestResponseTime: string;
  
  // Recommendations
  recommendationRate: number;
  
  // Issues
  totalIssues: number;
  issueBreakdown: {
    lateArrival: number;
    poorService: number;
    highPrice: number;
    unprofessional: number;
  };
}
