import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FeedbackService } from "./feedback.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SubmitFeedbackDto } from "./dto/feedback.dto";

@Controller("feedback")
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(@Req() req, @Body() dto: SubmitFeedbackDto) {
    return this.feedbackService.submitFeedback(req.user.userId, dto);
  }

  @Get("emergency/:emergencyId")
  async getFeedbackForEmergency(@Param("emergencyId") emergencyId: string) {
    return this.feedbackService.getFeedbackForEmergency(emergencyId);
  }

  @Get("mechanic/:mechanicId")
  async getMechanicFeedbacks(@Param("mechanicId") mechanicId: string) {
    return this.feedbackService.getMechanicFeedbacks(mechanicId);
  }

  @Get("mechanic/:mechanicId/performance")
  async getMechanicPerformance(@Param("mechanicId") mechanicId: string) {
    return this.feedbackService.getMechanicPerformance(mechanicId);
  }

  @Get("top-rated")
  async getTopRatedMechanics() {
    return this.feedbackService.getTopRatedMechanics();
  }
}
