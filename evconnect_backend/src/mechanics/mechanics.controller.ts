import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MechanicsService } from './mechanics.service';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { EmergencyRequestDto } from './dto/emergency-request.dto';

@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  @Post('register')
  register(@Body(ValidationPipe) createMechanicDto: CreateMechanicDto) {
    return this.mechanicsService.register(createMechanicDto);
  }

  @Get()
  findAll() {
    return this.mechanicsService.findAll();
  }

  @Get('nearby')
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    // Radius is already in kilometers from Flutter app
    const radiusNum = radius ? parseFloat(radius) : 10;
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      throw new Error('Invalid latitude or longitude');
    }
    
    return this.mechanicsService.findNearby(latNum, lngNum, radiusNum);
  }

  @Get('service/:service')
  findByService(@Param('service') service: string) {
    return this.mechanicsService.findByService(service);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mechanicsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMechanicDto: UpdateMechanicDto,
  ) {
    return this.mechanicsService.update(id, updateMechanicDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mechanicsService.remove(id);
  }

  @Patch(':id/rating')
  updateRating(
    @Param('id') id: string,
    @Body('rating') rating: number,
  ) {
    return this.mechanicsService.updateRating(id, rating);
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    return this.mechanicsService.getMyMechanicProfile(req.user.userId);
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard)
  async updateMyAvailability(
    @Request() req,
    @Body('available') available: boolean,
  ) {
    console.log('🔄 Mechanic availability update:', req.user.email, '-> available:', available);
    return this.mechanicsService.updateMyAvailability(req.user.userId, available);
  }

  @Delete('me/resign')
  @UseGuards(JwtAuthGuard)
  async resignMechanicRole(@Request() req) {
    console.log('👋 Mechanic resigning:', req.user.email);
    await this.mechanicsService.resignMechanicRole(req.user.userId);
    return {
      message: 'Your mechanic profile has been removed successfully. You can reapply as a mechanic anytime from the home screen.',
    };
  }

  @Post('emergency/recommend')
  @UseGuards(JwtAuthGuard)
  async getEmergencyRecommendations(
    @Request() req,
    @Body(ValidationPipe) emergencyRequest: EmergencyRequestDto,
  ) {
    console.log('🚨 Emergency request from:', req.user.email, 'at location:', emergencyRequest.lat, emergencyRequest.lng);
    return this.mechanicsService.getAIRecommendations(emergencyRequest, req.user.userId);
  }
}
