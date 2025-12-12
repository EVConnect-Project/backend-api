import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ValidationPipe } from '@nestjs/common';
import { ChargerService } from './charger.service';
import { CreateChargerDto } from './dto/create-charger.dto';
import { UpdateChargerDto } from './dto/update-charger.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateBookingModeDto } from './dto/update-booking-mode.dto';
import { UpdateChargerStatusDto } from './dto/update-charger-status.dto';
import { BookingMode } from './enums/booking-mode.enum';

@Controller('chargers')
export class ChargerController {
  constructor(private readonly chargerService: ChargerService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body(ValidationPipe) createChargerDto: CreateChargerDto, @Request() req) {
    return this.chargerService.create(createChargerDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.chargerService.findAll();
  }

  @Get('filter')
  filterChargers(@Query() filters: any) {
    // Convert string query params to proper types
    const filterDto = {
      lat: filters.lat ? parseFloat(filters.lat) : undefined,
      lng: filters.lng ? parseFloat(filters.lng) : undefined,
      radius: filters.radius ? parseFloat(filters.radius) : undefined,
      minPowerKw: filters.minPowerKw ? parseFloat(filters.minPowerKw) : undefined,
      maxPowerKw: filters.maxPowerKw ? parseFloat(filters.maxPowerKw) : undefined,
      speedTypes: filters.speedTypes ? (Array.isArray(filters.speedTypes) ? filters.speedTypes : [filters.speedTypes]) : undefined,
      connectorTypes: filters.connectorTypes ? (Array.isArray(filters.connectorTypes) ? filters.connectorTypes : [filters.connectorTypes]) : undefined,
      minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
      availableNow: filters.availableNow === 'true',
      accessTypes: filters.accessTypes ? (Array.isArray(filters.accessTypes) ? filters.accessTypes : [filters.accessTypes]) : undefined,
      bookingModes: filters.bookingModes ? (Array.isArray(filters.bookingModes) ? filters.bookingModes : filters.bookingModes.split(',')) : undefined,
      amenities: filters.amenities ? (Array.isArray(filters.amenities) ? filters.amenities : [filters.amenities]) : undefined,
      sortBy: filters.sortBy || 'distance',
      sortOrder: filters.sortOrder || 'asc',
      limit: filters.limit ? parseInt(filters.limit) : 50,
      offset: filters.offset ? parseInt(filters.offset) : 0,
    };

    return this.chargerService.filterChargers(filterDto);
  }

  @Get('filter-stations')
  filterStations(@Query() filters: any) {
    // Convert string query params to proper types
    const filterDto = {
      lat: filters.lat ? parseFloat(filters.lat) : undefined,
      lng: filters.lng ? parseFloat(filters.lng) : undefined,
      radius: filters.radius ? parseFloat(filters.radius) : undefined,
      availableNow: filters.availableNow === 'true',
      amenities: filters.amenities ? (Array.isArray(filters.amenities) ? filters.amenities : [filters.amenities]) : undefined,
      sortBy: filters.sortBy || 'distance',
      sortOrder: filters.sortOrder || 'asc',
      limit: filters.limit ? parseInt(filters.limit) : 50,
      offset: filters.offset ? parseInt(filters.offset) : 0,
    };

    return this.chargerService.filterStations(filterDto);
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = radius ? parseFloat(radius) : 10;
    
    return this.chargerService.findNearby(latNum, lngNum, radiusNum);
  }

  @Get('my-chargers')
  @UseGuards(JwtAuthGuard)
  findMyChargers(@Request() req) {
    return this.chargerService.findByOwner(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chargerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChargerDto: UpdateChargerDto,
    @Request() req,
  ) {
    return this.chargerService.update(id, updateChargerDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.chargerService.remove(id, req.user.userId);
  }

  @Patch(':id/booking-mode')
  @UseGuards(JwtAuthGuard)
  updateBookingMode(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateBookingModeDto,
    @Request() req,
  ) {
    return this.chargerService.updateBookingMode(id, updateDto, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateChargerStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateChargerStatusDto,
    @Request() req,
  ) {
    return this.chargerService.updateChargerStatus(id, updateDto, req.user.userId);
  }

  @Get('available/by-mode')
  getAvailableChargers(
    @Query('bookingMode') bookingMode?: BookingMode,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = lat ? parseFloat(lat) : undefined;
    const lngNum = lng ? parseFloat(lng) : undefined;
    const radiusNum = radius ? parseFloat(radius) : 10;
    
    return this.chargerService.getAvailableChargers(
      bookingMode, 
      latNum, 
      lngNum, 
      radiusNum
    );
  }
}
