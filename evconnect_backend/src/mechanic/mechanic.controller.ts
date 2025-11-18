import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MechanicService } from './mechanic.service';
import { CreateMechanicApplicationDto } from './dto/create-mechanic-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ApplicationStatus } from './entities/mechanic-application.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mechanic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MechanicController {
  constructor(private readonly mechanicService: MechanicService) {}

  /**
   * Apply to become a mechanic
   */
  @Post('apply')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async applyAsMechanic(
    @Body() createDto: CreateMechanicApplicationDto,
    @Request() req,
  ) {
    return this.mechanicService.applyAsMechanic(createDto, req.user.userId);
  }

  /**
   * Get user's application status
   */
  @Get('my-application')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async getMyApplication(@Request() req) {
    return this.mechanicService.getMyApplication(req.user.userId);
  }

  /**
   * Get all applications (admin only)
   */
  @Get('applications')
  @Roles('admin')
  async getAllApplications(@Query('status') status?: ApplicationStatus) {
    return this.mechanicService.getAllApplications(status);
  }

  /**
   * Get application by ID (admin only)
   */
  @Get('applications/:id')
  @Roles('admin')
  async getApplicationById(@Param('id') id: string) {
    return this.mechanicService.getApplicationById(id);
  }

  /**
   * Review application (admin only)
   */
  @Patch('applications/:id/review')
  @Roles('admin')
  async reviewApplication(
    @Param('id') id: string,
    @Body() reviewDto: ReviewApplicationDto,
    @Request() req,
  ) {
    return this.mechanicService.reviewApplication(
      id,
      reviewDto,
      req.user.userId,
    );
  }

  /**
   * Get all mechanics
   */
  @Get('list')
  @Roles('admin')
  async getAllMechanics() {
    return this.mechanicService.getAllMechanics();
  }
}
