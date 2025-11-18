import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { OwnerService } from './owner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsChargerOwnerGuard } from './guards/is-charger-owner.guard';
import { CreateChargerDto } from '../charger/dto/create-charger.dto';
import { UpdateChargerDto } from '../charger/dto/update-charger.dto';

/**
 * Owner Controller
 * Handles charger owner operations:
 * - Register new chargers (any authenticated user)
 * - View owned chargers
 * - View bookings for owned chargers
 * - Update charger details
 * - Manage charger status
 * - Delete owned chargers (owner permission)
 * 
 * Note: Only admins can verify/approve chargers via /admin/chargers/:id/approve
 */
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  /**
   * Register a new charger
   * User automatically becomes 'owner' if not already
   * Accessible to all authenticated users (user, owner, admin)
   * Chargers start as unverified - admin must approve via /admin/chargers/:id/approve
   */
  @Post('chargers')
  async registerCharger(
    @Body() createChargerDto: CreateChargerDto,
    @Request() req,
  ) {
    return this.ownerService.registerCharger(createChargerDto, req.user.userId);
  }

  /**
   * Get all chargers owned by the current user
   * Accessible to all authenticated users to check their charger status
   * Temporarily removed role restriction to debug 403 error
   */
  @Get('chargers')
  async getMyChargers(@Request() req) {
    return this.ownerService.getMyChargers(req.user.userId);
  }

  /**
   * Get specific charger details (must be owned by user)
   */
  @Get('chargers/:id')
  @UseGuards(IsChargerOwnerGuard)
  async getChargerById(@Param('id') id: string, @Request() req) {
    return this.ownerService.getChargerById(id, req.user.userId);
  }

  /**
   * Update charger details (must be owned by user)
   */
  @Patch('chargers/:id')
  @UseGuards(IsChargerOwnerGuard)
  async updateCharger(
    @Param('id') id: string,
    @Body() updateChargerDto: UpdateChargerDto,
    @Request() req,
  ) {
    return this.ownerService.updateCharger(id, updateChargerDto, req.user.userId);
  }

  /**
   * Update charger status (available, in-use, offline)
   * Owner can change operational status, but cannot verify/approve charger
   * Only admin can verify chargers via /admin/chargers/:id/approve
   */
  @Patch('chargers/:id/status')
  @UseGuards(IsChargerOwnerGuard)
  async updateChargerStatus(
    @Param('id') id: string,
    @Body('status') status: 'available' | 'in-use' | 'offline',
    @Request() req,
  ) {
    return this.ownerService.updateChargerStatus(id, status, req.user.userId);
  }

  /**
   * Delete charger permanently
   * Owner can delete their own charger if it has no active bookings
   */
  @Delete('chargers/:id')
  async deleteCharger(@Param('id') id: string, @Request() req) {
    return this.ownerService.deleteCharger(id, req.user.userId);
  }

  /**
   * Get all bookings for chargers owned by current user
   */
  @Get('bookings')
  @UseGuards(IsChargerOwnerGuard)
  async getMyBookings(
    @Request() req,
    @Query('status') status?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.ownerService.getBookingsForMyChargers(
      req.user.userId,
      status,
      chargerId,
    );
  }

  /**
   * Get specific booking details (must be for owned charger)
   */
  @Get('bookings/:id')
  @UseGuards(IsChargerOwnerGuard)
  async getBookingById(@Param('id') id: string, @Request() req) {
    return this.ownerService.getBookingById(id, req.user.userId);
  }

  /**
   * Get booking statistics for owned chargers
   */
  @Get('stats/bookings')
  @UseGuards(IsChargerOwnerGuard)
  async getBookingStats(@Request() req) {
    return this.ownerService.getBookingStats(req.user.userId);
  }

  /**
   * Get revenue statistics for owned chargers
   */
  @Get('stats/revenue')
  @UseGuards(IsChargerOwnerGuard)
  async getRevenueStats(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ownerService.getRevenueStats(
      req.user.userId,
      startDate,
      endDate,
    );
  }

  /**
   * Get charger utilization statistics
   */
  @Get('stats/utilization')
  @UseGuards(IsChargerOwnerGuard)
  async getUtilizationStats(@Request() req) {
    return this.ownerService.getUtilizationStats(req.user.userId);
  }
}
