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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import {
  UpdateUserRoleDto,
  UpdateChargerDto,
  RejectChargerDto,
  GetUsersDto,
  GetChargersDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('stats')
  async getDashboardStats() {
    try {
      return await this.adminService.getDashboardStats();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // User Management
  @Get('users')
  async getUsers(@Query() query: GetUsersDto) {
    try {
      return await this.adminService.getUsers(query);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    try {
      return await this.adminService.getUserById(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post('users/:id/ban')
  async banUser(@Param('id') id: string) {
    try {
      return await this.adminService.banUser(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    try {
      return await this.adminService.unbanUser(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    try {
      return await this.adminService.updateUserRole(id, updateUserRoleDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // Charger Management
  @Get('chargers')
  async getChargers(@Query() query: GetChargersDto) {
    try {
      return await this.adminService.getChargers(query);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('chargers/:id/approve')
  async approveCharger(@Param('id') id: string) {
    try {
      return await this.adminService.approveCharger(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post('chargers/:id/reject')
  async rejectCharger(
    @Param('id') id: string,
    @Body() rejectChargerDto: RejectChargerDto,
  ) {
    try {
      return await this.adminService.rejectCharger(id, rejectChargerDto.reason);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch('chargers/:id')
  async updateCharger(
    @Param('id') id: string,
    @Body() updateChargerDto: UpdateChargerDto,
  ) {
    try {
      return await this.adminService.updateCharger(id, updateChargerDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // Analytics
  @Get('analytics/revenue')
  async getRevenueData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      return await this.adminService.getRevenueData(startDate, endDate);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/user-growth')
  async getUserGrowthData(@Query('period') period?: string) {
    try {
      return await this.adminService.getUserGrowthData(period);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/bookings')
  async getBookingStats() {
    try {
      return await this.adminService.getBookingStats();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
