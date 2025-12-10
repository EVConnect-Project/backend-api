import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BreakdownService } from './breakdown.service';
import { CreateBreakdownRequestDto } from './dto/create-breakdown-request.dto';
import { UpdateBreakdownStatusDto } from './dto/update-breakdown-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MechanicAccessGuard } from './guards/mechanic-access.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('breakdown')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BreakdownController {
  constructor(private readonly breakdownService: BreakdownService) {}

  /**
   * Create a breakdown assistance request
   */
  @Post('request')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async createRequest(
    @Body() createDto: CreateBreakdownRequestDto,
    @Request() req,
  ) {
    return this.breakdownService.createRequest(createDto, req.user.userId);
  }

  /**
   * Get user's breakdown requests
   */
  @Get('my-requests')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async getMyRequests(@Request() req) {
    return this.breakdownService.getMyRequests(req.user.userId);
  }

  /**
   * Get specific request details
   */
  @Get('request/:id')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async getRequestById(@Param('id') id: string, @Request() req) {
    return this.breakdownService.getRequestById(id, req.user.userId);
  }

  /**
   * Get available requests (for mechanics)
   */
  @Get('available')
  @UseGuards(JwtAuthGuard, MechanicAccessGuard)
  async getAvailableRequests(@Request() req) {
    return this.breakdownService.getAvailableRequests(req.user.userId);
  }

  /**
   * Get mechanic's assigned requests
   */
  @Get('mechanic/my-requests')
  @UseGuards(JwtAuthGuard, MechanicAccessGuard)
  async getMechanicRequests(@Request() req) {
    return this.breakdownService.getMechanicRequests(req.user.userId);
  }

  /**
   * Assign mechanic to request
   */
  @Post('request/:id/assign')
  @UseGuards(JwtAuthGuard, MechanicAccessGuard)
  async assignMechanic(@Param('id') id: string, @Request() req) {
    return this.breakdownService.assignMechanic(id, req.user.userId);
  }

  /**
   * Update request status
   */
  @Patch('request/:id')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBreakdownStatusDto,
    @Request() req,
  ) {
    return this.breakdownService.updateStatus(id, updateDto, req.user.userId);
  }

  /**
   * Cancel request
   */
  @Delete('request/:id')
  @Roles('user', 'owner', 'mechanic', 'admin')
  async cancelRequest(@Param('id') id: string, @Request() req) {
    return this.breakdownService.cancelRequest(id, req.user.userId);
  }
}
