import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ValidationPipe, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { UpdateListingStatusDto } from './dto/update-listing-status.dto';
import { GetMarketplaceFeedDto } from './dto/get-marketplace-feed.dto';
import { GetAdminListingsDto } from './dto/get-admin-listings.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 listings per minute
  createListing(
    @Body(ValidationPipe) createDto: CreateListingDto,
    @Request() req,
  ) {
    return this.marketplaceService.createListing(createDto, req.user.userId);
  }

  @Get('listings')
  getPublicListings() {
    return this.marketplaceService.getPublicListings();
  }

  @Get('feed')
  getMarketplaceFeed(@Query() dto: GetMarketplaceFeedDto) {
    console.log('🎯 Controller: getMarketplaceFeed called', dto);
    return this.marketplaceService.getMarketplaceFeed(dto);
  }

  @Get('listings/:id')
  @UseGuards(JwtAuthGuard)
  getListingById(@Param('id') id: string, @Request() req) {
    return this.marketplaceService.getListingById(id, req.user?.userId);
  }

  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  getMyListings(@Request() req) {
    console.log('📱 /my-listings called by user:', req.user);
    return this.marketplaceService.getUserListings(req.user.userId);
  }

  @Patch('listings/:id')
  @UseGuards(JwtAuthGuard)
  updateListing(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateListingDto,
    @Request() req,
  ) {
    return this.marketplaceService.updateListing(id, updateDto, req.user.userId);
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  deleteListing(@Param('id') id: string, @Request() req) {
    return this.marketplaceService.deleteListing(id, req.user.userId);
  }

  @Patch('listings/:id/mark-sold')
  @UseGuards(JwtAuthGuard)
  markAsSold(@Param('id') id: string, @Request() req) {
    return this.marketplaceService.markListingAsSold(id, req.user.userId);
  }
}

@Controller('admin/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminMarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  getAdminListings(@Query(ValidationPipe) dto: GetAdminListingsDto) {
    return this.marketplaceService.getAdminListings(dto);
  }

  @Patch('listings/:id/approve')
  approveListing(@Param('id') id: string) {
    return this.marketplaceService.adminApproveListing(id);
  }

  @Patch('listings/:id/reject')
  rejectListing(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: RejectListingDto,
  ) {
    return this.marketplaceService.adminRejectListing(id, dto.reason);
  }

  @Delete('listings/:id')
  adminDeleteListing(@Param('id') id: string) {
    return this.marketplaceService.adminDeleteListing(id);
  }
}
