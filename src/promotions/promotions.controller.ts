import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  TrackPromotionDto,
  CreateAbTestDto,
  UpdateAbTestDto,
} from './dto/promotion.dto';
import { AdPlacement } from './entities/promotion.entity';
import { AdEventType } from './entities/ad-impression.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('v1/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // ── Promotion CRUD ─────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.promotionsService.findActive();
  }

  @Get('serve')
  @UseGuards(JwtAuthGuard)
  serve(@Request() req, @Query('placement') placement?: string) {
    const validPlacements = Object.values(AdPlacement);
    const adPlacement = validPlacements.includes(placement as AdPlacement)
      ? (placement as AdPlacement)
      : AdPlacement.HOME_BANNER;
    const userId = req.user?.userId;

    // Pass user context for audience targeting
    const userContext = req.user ? {
      vehicleType: req.user.vehicleType,
      vehicleBrand: req.user.vehicleBrand,
      role: req.user.role,
      accountCreatedAt: req.user.createdAt ? new Date(req.user.createdAt) : undefined,
    } : undefined;

    return this.promotionsService.findByPlacement(adPlacement, userId, userContext);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getStats() {
    return this.promotionsService.getStats();
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAnalytics(
    @Query('promotionId') promotionId?: string,
    @Query('placement') placement?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.promotionsService.getAdAnalytics({ promotionId, placement, startDate, endDate });
  }

  // ── Revenue ────────────────────────────────────────────────

  @Get('revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.promotionsService.getRevenueOverview({ startDate, endDate });
  }

  // ── A/B Tests ──────────────────────────────────────────────

  @Post('ab-tests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createAbTest(@Body() dto: CreateAbTestDto) {
    return this.promotionsService.createAbTest(dto);
  }

  @Get('ab-tests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllAbTests() {
    return this.promotionsService.findAllAbTests();
  }

  @Get('ab-tests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findOneAbTest(@Param('id') id: string) {
    return this.promotionsService.findOneAbTest(id);
  }

  @Get('ab-tests/:id/results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAbTestResults(@Param('id') id: string) {
    return this.promotionsService.getAbTestResults(id);
  }

  @Patch('ab-tests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateAbTest(@Param('id') id: string, @Body() dto: UpdateAbTestDto) {
    return this.promotionsService.updateAbTest(id, dto);
  }

  @Post('ab-tests/:id/declare-winner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  declareWinner(@Param('id') id: string, @Body('winnerId') winnerId: string) {
    return this.promotionsService.declareWinner(id, winnerId);
  }

  @Delete('ab-tests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteAbTest(@Param('id') id: string) {
    return this.promotionsService.deleteAbTest(id);
  }

  // ── Single Promotion ───────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }

  @Post(':id/track')
  @UseGuards(JwtAuthGuard)
  async track(
    @Param('id') id: string,
    @Body() trackDto: TrackPromotionDto,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    const { eventType, placement } = trackDto;

    if (eventType === 'impression') {
      await this.promotionsService.trackImpression(id, userId, placement);
    } else if (eventType === 'click') {
      await this.promotionsService.trackClick(id, userId, placement);
    } else if (eventType === 'conversion') {
      await this.promotionsService.trackConversion(id, userId, placement);
    } else if (eventType === 'dismiss') {
      await this.promotionsService.trackEvent(id, AdEventType.DISMISS, userId, placement);
    }

    return { success: true };
  }
}
