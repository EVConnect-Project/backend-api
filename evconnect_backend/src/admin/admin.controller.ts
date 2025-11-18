import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  // Dashboard Stats
  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Analytics
  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getAnalytics(startDate, endDate);
  }

  @Get('analytics/revenue')
  async getRevenueData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getRevenueData(startDate, endDate);
  }

  @Get('analytics/user-growth')
  async getUserGrowth(@Query('period') period: string) {
    return this.adminService.getUserGrowthData(period);
  }

  @Get('analytics/bookings')
  async getBookingStats() {
    return this.adminService.getBookingStats();
  }

  // User Management
  @Get('users')
  async getUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('role') role: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      role,
    });
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users/:id/ban')
  async banUser(@Param('id') id: string) {
    const user = await this.adminService.banUser(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  @Post('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    const user = await this.adminService.unbanUser(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    const user = await this.adminService.updateUserRole(id, role);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  // Charger Management
  @Get('chargers')
  async getChargers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('status') status: string,
    @Query('verified') verified: string,
  ) {
    return this.adminService.getChargers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      status,
      verified: verified ? verified === 'true' : undefined,
    });
  }

  @Get('chargers/:id')
  async getChargerById(@Param('id') id: string) {
    return this.adminService.getChargerById(id);
  }

  @Post('chargers/:id/approve')
  async approveCharger(@Param('id') id: string) {
    const charger = await this.adminService.approveCharger(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Post('chargers/:id/reject')
  async rejectCharger(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const charger = await this.adminService.rejectCharger(id, reason);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Patch('chargers/:id')
  async updateCharger(@Param('id') id: string, @Body() data: any) {
    const charger = await this.adminService.updateCharger(id, data);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Delete('chargers/:id')
  async deleteCharger(@Param('id') id: string) {
    const charger = await this.adminService.deleteCharger(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  // Booking Management
  @Get('bookings')
  async getBookings(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getBookings({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      startDate,
      endDate,
    });
  }

  @Get('bookings/:id')
  async getBookingById(@Param('id') id: string) {
    return this.adminService.getBookingById(id);
  }

  @Post('bookings/:id/approve')
  async approveBooking(@Param('id') id: string) {
    const booking = await this.adminService.approveBooking(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return booking;
  }

  @Post('bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.adminService.cancelBooking(id, reason);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return booking;
  }

  // Mechanic Application Management
  @Get('mechanic-applications')
  async getMechanicApplications(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    return this.adminService.getMechanicApplications({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      search,
    });
  }

  @Get('mechanic-applications/:id')
  async getMechanicApplicationById(@Param('id') id: string) {
    return this.adminService.getMechanicApplicationById(id);
  }

  @Post('mechanic-applications/:id/approve')
  async approveMechanicApplication(
    @Param('id') id: string,
    @Body('reviewNotes') reviewNotes: string,
    @Request() req,
  ) {
    const application = await this.adminService.approveMechanicApplication(
      id,
      reviewNotes,
      req.user.userId,
    );
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return application;
  }

  @Post('mechanic-applications/:id/reject')
  async rejectMechanicApplication(
    @Param('id') id: string,
    @Body('reviewNotes') reviewNotes: string,
    @Request() req,
  ) {
    const application = await this.adminService.rejectMechanicApplication(
      id,
      reviewNotes,
      req.user.userId,
    );
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return application;
  }

  // Mechanics Management
  @Get('mechanics')
  async getMechanics(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('available') available: string,
  ) {
    return this.adminService.getMechanics({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      available: available ? available === 'true' : undefined,
    });
  }

  @Get('mechanics/:id')
  async getMechanicById(@Param('id') id: string) {
    return this.adminService.getMechanicById(id);
  }

  @Patch('mechanics/:id')
  async updateMechanic(@Param('id') id: string, @Body() data: any) {
    const mechanic = await this.adminService.updateMechanic(id, data);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return mechanic;
  }

  @Delete('mechanics/:id')
  async deleteMechanic(@Param('id') id: string) {
    const mechanic = await this.adminService.deleteMechanic(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return mechanic;
  }
}
