import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmergencyService } from './emergency.service';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  /**
   * Mechanic responds to emergency request
   * POST /emergency/requests/:requestId/respond
   */
  @Post('requests/:requestId/respond')
  async respondToEmergency(
    @Param('requestId') requestId: string,
    @Request() req,
    @Body() body: {
      responseType: 'accepted' | 'declined';
      etaMinutes?: number;
      notes?: string;
    },
  ) {
    // Get mechanic ID from user
    const mechanicId = req.user.mechanicId; // Assuming mechanic ID is stored in JWT
    
    return this.emergencyService.respondToEmergency(
      requestId,
      mechanicId,
      body.responseType,
      body.etaMinutes,
      body.notes,
    );
  }

  /**
   * User selects a mechanic from accepted responses
   * POST /emergency/requests/:requestId/select
   */
  @Post('requests/:requestId/select')
  async selectMechanic(
    @Param('requestId') requestId: string,
    @Request() req,
    @Body() body: { mechanicId: string },
  ) {
    return this.emergencyService.selectMechanic(
      requestId,
      req.user.userId,
      body.mechanicId,
    );
  }

  /**
   * Mechanic updates their status
   * PATCH /emergency/requests/:requestId/status
   */
  @Patch('requests/:requestId/status')
  async updateStatus(
    @Param('requestId') requestId: string,
    @Request() req,
    @Body() body: {
      status: 'on_the_way' | 'arrived' | 'job_complete';
      latitude?: number;
      longitude?: number;
    },
  ) {
    const mechanicId = req.user.mechanicId;
    
    return this.emergencyService.updateMechanicStatus(
      requestId,
      mechanicId,
      body.status,
      body.latitude,
      body.longitude,
    );
  }

  /**
   * Get emergency request details with responses
   * GET /emergency/requests/:requestId
   */
  @Get('requests/:requestId')
  async getRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    return this.emergencyService.getEmergencyRequest(requestId, req.user.userId);
  }

  /**
   * Get all user's emergency requests
   * GET /emergency/requests
   */
  @Get('requests')
  async getUserRequests(@Request() req) {
    return this.emergencyService.getUserEmergencyRequests(req.user.userId);
  }

  /**
   * Cancel emergency request
   * DELETE /emergency/requests/:requestId
   */
  @Delete('requests/:requestId')
  async cancelRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.emergencyService.cancelEmergencyRequest(requestId, req.user.userId);
    return { message: 'Emergency request cancelled successfully' };
  }
}
