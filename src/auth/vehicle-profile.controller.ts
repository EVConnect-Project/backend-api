import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VehicleProfileService } from './vehicle-profile.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth/vehicle-profiles')
@UseGuards(JwtAuthGuard)
export class VehicleProfileController {
  private readonly logger = new Logger(VehicleProfileController.name);

  constructor(private readonly vehicleProfileService: VehicleProfileService) {}

  @Get()
  async findAll(@Request() req) {
    try {
      this.logger.log(`🚗 GET /auth/vehicle-profiles - User: ${req.user?.userId}`);
      const vehicles = await this.vehicleProfileService.findAllByUser(req.user.userId);
      this.logger.log(`🚗 Returning ${vehicles.length} vehicles for user ${req.user.userId}`);
      return vehicles;
    } catch (error) {
      this.logger.error(`❌ Error in findAll: ${error.message}`, error.stack);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch vehicle profiles',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.vehicleProfileService.findOne(id, req.user.userId);
  }

  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto, @Request() req) {
    try {
      this.logger.log(`🚗 POST /auth/vehicle-profiles - User: ${req.user?.userId}`);
      this.logger.log(`🚗 Vehicle data: ${JSON.stringify(createVehicleDto)}`);
      const vehicle = await this.vehicleProfileService.create(req.user.userId, createVehicleDto);
      this.logger.log(`🚗 Vehicle created successfully with ID: ${vehicle.id}`);
      return vehicle;
    } catch (error) {
      this.logger.error(`❌ Error creating vehicle: ${error.message}`, error.stack);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Failed to create vehicle',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req,
  ) {
    return this.vehicleProfileService.update(id, req.user.userId, updateVehicleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.vehicleProfileService.remove(id, req.user.userId);
    return { message: 'Vehicle deleted successfully' };
  }

  @Patch(':id/primary')
  async setPrimary(@Param('id') id: string, @Request() req) {
    return this.vehicleProfileService.setPrimary(id, req.user.userId);
  }
}
