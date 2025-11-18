import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ValidationPipe } from '@nestjs/common';
import { ChargerService } from './charger.service';
import { CreateChargerDto } from './dto/create-charger.dto';
import { UpdateChargerDto } from './dto/update-charger.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
