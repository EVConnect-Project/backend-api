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
import { EmergencyChatService } from './services/emergency-chat.service';

@Controller('mechanics')
export class MechanicsController {
  constructor(
    private readonly mechanicsService: MechanicsService,
    private readonly emergencyChatService: EmergencyChatService,
  ) {}

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
    console.log('🔄 Mechanic availability update:', req.user.phoneNumber, '-> available:', available);
    return this.mechanicsService.updateMyAvailability(req.user.userId, available);
  }

  @Delete('me/resign')
  @UseGuards(JwtAuthGuard)
  async resignMechanicRole(@Request() req) {
    console.log('👋 Mechanic resigning:', req.user.phoneNumber);
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
    console.log('🚨 Emergency request from:', req.user.phoneNumber, 'at location:', emergencyRequest.lat, emergencyRequest.lng);
    return this.mechanicsService.getAIRecommendations(emergencyRequest, req.user.userId);
  }

  @Post('emergency/alert')
  @UseGuards(JwtAuthGuard)
  async sendEmergencyAlert(
    @Request() req,
    @Body() body: { 
      mechanicIds: string[]; 
      userLocation: { lat: number; lng: number };
      problemDescription?: string;
      vehicleDetails?: any;
    },
  ) {
    console.log('🚨 Sending emergency alerts to mechanics:', body.mechanicIds, 'from user:', req.user.phoneNumber);
    return this.mechanicsService.sendEmergencyAlerts(
      req.user.userId,
      body.mechanicIds,
      body.userLocation,
      body.problemDescription,
      body.vehicleDetails,
    );
  }

  @Post('emergency/chat')
  @UseGuards(JwtAuthGuard)
  async createEmergencyChat(
    @Request() req,
    @Body() body: {
      mechanicId: string;
      emergencyRequestId?: string;
      problemType: string;
      location: { lat: number; lng: number };
    },
  ) {
    console.log('💬 Creating emergency chat for user:', req.user.phoneNumber, 'with mechanic:', body.mechanicId);
    return this.emergencyChatService.createEmergencyChat({
      userId: req.user.userId,
      mechanicId: body.mechanicId,
      emergencyRequestId: body.emergencyRequestId,
      problemType: body.problemType,
      location: body.location,
    });
  }

  @Get('emergency/chat/templates/:problemType')
  @UseGuards(JwtAuthGuard)
  async getQuickTemplates(@Param('problemType') problemType: string) {
    return {
      templates: this.emergencyChatService.getQuickMessageTemplates(problemType),
      mechanicTemplates: this.emergencyChatService.getMechanicQuickTemplates(),
    };
  }

  @Post('emergency/chat/:conversationId/status')
  @UseGuards(JwtAuthGuard)
  async sendStatusUpdate(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body: {
      status: 'en_route' | 'arrived' | 'working' | 'completed' | 'delayed';
      additionalInfo?: string;
    },
  ) {
    return this.emergencyChatService.sendEmergencyStatusUpdate(
      conversationId,
      req.user.userId,
      body.status,
      body.additionalInfo,
    );
  }

  @Post('emergency/chat/:conversationId/eta')
  @UseGuards(JwtAuthGuard)
  async sendETAUpdate(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body: {
      etaMinutes: number;
      trafficConditions?: string;
    },
  ) {
    return this.emergencyChatService.sendETAUpdate(
      conversationId,
      req.user.userId,
      body.etaMinutes,
      body.trafficConditions,
    );
  }

  @Post('emergency/chat/:conversationId/location')
  @UseGuards(JwtAuthGuard)
  async shareLocation(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body: {
      lat: number;
      lng: number;
      label?: string;
    },
  ) {
    return this.emergencyChatService.shareLocation(
      conversationId,
      req.user.userId,
      body.lat,
      body.lng,
      body.label,
    );
  }

  @Get('emergency/chat/:conversationId/summary')
  @UseGuards(JwtAuthGuard)
  async getChatSummary(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    return this.emergencyChatService.getEmergencyChatSummary(conversationId, req.user.userId);
  }

  // Live tracking endpoints

  @Get(':id/location')
  @UseGuards(JwtAuthGuard)
  async getMechanicLocation(@Param('id') mechanicId: string) {
    const mechanic = await this.mechanicsService.findOne(mechanicId);
    
    return {
      mechanicId: mechanic.id,
      latitude: mechanic.currentLocationLat,
      longitude: mechanic.currentLocationLng,
      isAvailable: mechanic.available,
      isOnJob: mechanic.isOnJob,
      lastUpdated: mechanic.lastOnlineAt,
    };
  }

  @Post('route-with-traffic')
  @UseGuards(JwtAuthGuard)
  async getRouteWithTraffic(
    @Body() body: {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
    },
  ) {
    return this.mechanicsService.getRouteWithTraffic(
      body.originLat,
      body.originLng,
      body.destLat,
      body.destLng,
    );
  }
}
