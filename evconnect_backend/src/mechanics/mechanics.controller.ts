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
} from '@nestjs/common';
import { MechanicsService } from './mechanics.service';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';

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
    // Convert radius from meters to kilometers (Flutter sends meters, backend expects km)
    const radiusNum = radius ? parseFloat(radius) / 1000 : 10;
    
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
}
