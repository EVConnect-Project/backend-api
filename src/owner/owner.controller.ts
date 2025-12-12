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
import { CreateIndividualChargerDto } from './dto/create-individual-charger.dto';
import { CreateStationDto } from './dto/create-station.dto';

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
   * Register an individual charger with sockets configuration
   * Supports complex socket-based configuration from mobile app
   */
  @Post('chargers/individual')
  async registerIndividualCharger(
    @Body() createIndividualChargerDto: CreateIndividualChargerDto,
    @Request() req,
  ) {
    return this.ownerService.registerIndividualCharger(
      createIndividualChargerDto,
      req.user.userId,
    );
  }

  /**
   * Register a charging station with multiple chargers
   * Supports full station configuration with amenities from mobile app
   */
  @Post('chargers/station')
  async registerStation(
    @Body() createStationDto: CreateStationDto,
    @Request() req,
  ) {
    return this.ownerService.registerStation(
      createStationDto,
      req.user.userId,
    );
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
  @UseGuards(IsChargerOwnerGuard)
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
   * Delete a pending booking (must be for owned charger)
   */
  @Delete('bookings/:id')
  @UseGuards(IsChargerOwnerGuard)
  async deletePendingBooking(@Param('id') id: string, @Request() req) {
    return this.ownerService.deletePendingBooking(id, req.user.userId);
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
