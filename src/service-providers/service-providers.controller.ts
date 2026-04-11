import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceProvidersService } from './service-providers.service';

type ServiceMode = 'emergency' | 'planned';
type ProviderType = 'individual_mechanic' | 'service_station';

@Controller('service-providers')
export class ServiceProvidersController {
  constructor(private readonly serviceProvidersService: ServiceProvidersService) {}

  @Get('search')
  async search(
    @Query('mode') mode: ServiceMode = 'planned',
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('issueType') issueType?: string,
    @Query('userId') userId?: string,
    @Query('providerType') providerType?: ProviderType,
  ) {
    const parsedMode: ServiceMode = mode === 'emergency' ? 'emergency' : 'planned';
    const parsedLat = lat != null ? parseFloat(lat) : undefined;
    const parsedLng = lng != null ? parseFloat(lng) : undefined;
    const parsedRadius = radius != null ? parseFloat(radius) : 20;

    return this.serviceProvidersService.searchProviders({
      mode: parsedMode,
      lat: Number.isFinite(parsedLat as number) ? parsedLat : undefined,
      lng: Number.isFinite(parsedLng as number) ? parsedLng : undefined,
      radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : 20,
      issueType: issueType?.trim() || undefined,
      userId: userId?.trim() || undefined,
      providerType,
    });
  }

  @Get('stations/:id')
  async getStationById(@Param('id') id: string) {
    return this.serviceProvidersService.getStationById(id);
  }

  @Post('signals')
  @UseGuards(JwtAuthGuard)
  async recordProviderSignal(
    @Body('providerId') providerId: string,
    @Body('providerType') providerType: ProviderType,
    @Body('mode') mode: ServiceMode,
    @Body('action') action: string,
    @Body('issueType') issueType: string | undefined,
    @Request() req,
  ) {
    return this.serviceProvidersService.recordProviderSignal({
      userId: req.user.userId,
      providerId,
      providerType,
      mode,
      action,
      issueType,
    });
  }

}
