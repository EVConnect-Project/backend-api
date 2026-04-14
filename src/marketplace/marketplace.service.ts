import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, Like } from 'typeorm';
import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { MarketplaceImage } from './entities/marketplace-image.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { GetMarketplaceFeedDto } from './dto/get-marketplace-feed.dto';
import { GetAdminListingsDto } from './dto/get-admin-listings.dto';
import { NotificationService } from './notification.service';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private listingRepository: Repository<MarketplaceListing>,
    @InjectRepository(MarketplaceImage)
    private imageRepository: Repository<MarketplaceImage>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private notificationService: NotificationService,
  ) {}

  async createListing(dto: CreateListingDto, sellerId: string): Promise<MarketplaceListing> {
    console.log('📝 Creating listing for seller:', sellerId);
    
    // Check if seller is banned
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });
    if (seller && seller.isBanned) {
      throw new ForbiddenException('Your account has been suspended. You cannot create new listings.');
    }
    
    const listing = this.listingRepository.create({
      title: dto.title,
      description: dto.description,
      category: dto.category,
      price: dto.price,
      condition: dto.condition,
      city: dto.city,
      lat: dto.lat,
      long: dto.long,
      sellerId: sellerId,
      status: 'pending',
    });

    const savedListing = await this.listingRepository.save(listing);
    console.log('✅ Listing created:', { 
      id: savedListing.id, 
      sellerId: savedListing.sellerId,
      status: savedListing.status,
      title: savedListing.title 
    });

    // Create images if provided
    if (dto.images && dto.images.length > 0) {
      const images = dto.images.map((imageUrl) => 
        this.imageRepository.create({
          imageUrl,
          listing: { id: savedListing.id } as any,
        })
      );
      await this.imageRepository.save(images);
    }

    return this.getListingById(savedListing.id, sellerId);
  }

  async getPublicListings(): Promise<MarketplaceListing[]> {
    return this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.seller', 'seller')
      .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber'])
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.status = :status', { status: 'approved' })
      .andWhere('listing.isBanned = :isBanned', { isBanned: false })
      .andWhere('seller.isBanned = :sellerBanned', { sellerBanned: false })
      .orderBy('listing.createdAt', 'DESC')
      .getMany();
  }

  async getListingById(id: string, requestingUserId?: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.seller', 'seller')
      .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber'])
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    // If listing is not approved, only seller can view it
    if (listing.status !== 'approved') {
      if (!requestingUserId || listing.sellerId !== requestingUserId) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }
    }

    return listing;
  }

  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    console.log('🔍 Getting listings for userId:', userId);
    
    // Use QueryBuilder with sellerId column for more reliable querying
    const listings = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.sellerId = :userId', { userId })
      .orderBy('listing.createdAt', 'DESC')
      .getMany();
    
    console.log(`📋 Found ${listings.length} listings for user ${userId}`);
    if (listings.length > 0) {
      const statusCounts = listings.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('   Status breakdown:', statusCounts);
      console.log('   First listing:', { 
        id: listings[0].id, 
        title: listings[0].title, 
        status: listings[0].status,
        sellerId: listings[0].sellerId 
      });
    }
    
    return listings;
  }

  async updateListing(
    id: string,
    dto: UpdateListingDto,
    userId: string,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    // Only seller can update their own listing
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Cannot update sold listings, but can update all others including approved
    if (listing.status === 'sold') {
      throw new BadRequestException('Cannot update sold listings');
    }

    // Update fields if provided
    if (dto.title !== undefined) listing.title = dto.title;
    if (dto.description !== undefined) listing.description = dto.description;
    if (dto.price !== undefined) listing.price = dto.price;
    if (dto.category !== undefined) listing.category = dto.category;
    if (dto.condition !== undefined) listing.condition = dto.condition;
    if (dto.city !== undefined) listing.city = dto.city;
    if (dto.lat !== undefined) listing.lat = dto.lat;
    if (dto.long !== undefined) listing.long = dto.long;

    // Reset to pending if was rejected
    if (listing.status === 'rejected') {
      listing.status = 'pending';
      listing.adminNotes = null;
    }

    // Save the listing first
    const savedListing = await this.listingRepository.save(listing);

    // Handle images update - replace existing images with new list
    if (dto.images !== undefined && Array.isArray(dto.images)) {
      // Remove old images from database
      if (savedListing.images && savedListing.images.length > 0) {
        await this.imageRepository.remove(savedListing.images);
      }

      // Create and save new images
      if (dto.images.length > 0) {
        const newImages = dto.images.map(imageUrl => {
          return this.imageRepository.create({
            imageUrl,
            listing: { id: savedListing.id } as any,
          });
        });
        await this.imageRepository.save(newImages);
      }
    }

    return this.getListingById(savedListing.id, userId);
  }

  async deleteListing(id: string, userId: string): Promise<{ message: string }> {
    console.log(`🗑️ Delete listing request: id=${id}, userId=${userId}`);
    
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      console.log(`❌ Listing ${id} not found`);
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    console.log(`📋 Listing found: ${listing.title}, status: ${listing.status}, sellerId: ${listing.sellerId}`);

    // Only seller can delete their own listing
    if (listing.sellerId !== userId) {
      console.log(`❌ Permission denied: seller ${listing.sellerId} !== user ${userId}`);
      throw new ForbiddenException('You can only delete your own listings');
    }

    console.log(`✅ Permanently deleting listing ${id} (${listing.title})...`);
    await this.listingRepository.remove(listing);
    // Images will be cascade deleted due to onDelete: 'CASCADE'

    console.log(`✅ Listing ${id} permanently deleted from database`);
    return { message: 'Listing deleted successfully' };
  }

  async adminDeleteListing(id: string): Promise<{ message: string }> {
    console.log(`🛡️ Admin deleting listing: ${id}`);
    
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      console.log(`❌ Listing ${id} not found for admin deletion`);
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    console.log(`✅ Admin permanently deleting listing: ${listing.title} (status: ${listing.status})`);
    await this.listingRepository.remove(listing);
    console.log(`✅ Listing ${id} permanently removed from database by admin`);
    
    return { message: 'Listing deleted by admin' };
  }

  async markListingAsSold(id: string, userId: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can mark their listing as sold');
    }

    if (listing.status !== 'approved') {
      throw new BadRequestException('Only approved listings can be marked as sold');
    }

    listing.status = 'sold';
    return this.listingRepository.save(listing);
  }

  async adminApproveListing(id: string): Promise<MarketplaceListing> {
    console.log(`✅ Admin approving listing: ${id}`);
    
    const listing = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.seller', 'seller')
      .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber'])
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (!listing.seller) {
      throw new NotFoundException('Seller information not found');
    }
    
    console.log(`📋 Current status: ${listing.status} → Changing to: approved`);
    listing.status = 'approved';
    const savedListing = await this.listingRepository.save(listing);
    console.log(`✅ Listing ${id} saved with status: ${savedListing.status}`);
    
    // Notify seller about approval
    await this.notificationService.notifyListingApproved(savedListing);

    return savedListing;
  }

  async adminRejectListing(id: string, reason: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.seller', 'seller')
      .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber'])
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.id = :id', { id })
      .getOne();

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (!listing.seller) {
      throw new NotFoundException('Seller information not found');
    }
    
    listing.status = 'rejected';
    listing.adminNotes = reason;
    const savedListing = await this.listingRepository.save(listing);
    
    // Notify seller about rejection
    await this.notificationService.notifyListingRejected(savedListing, reason);

    return savedListing;
  }

  async getAdminListings(dto: GetAdminListingsDto): Promise<{
    listings: MarketplaceListing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.seller', 'seller')
      .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber'])
      .leftJoinAndSelect('listing.images', 'images');

    // Filter by status if provided (handle comma-separated statuses)
    if (dto.status) {
      const statuses = dto.status.split(',').map(s => s.trim());
      if (statuses.length > 1) {
        queryBuilder.where('listing.status IN (:...statuses)', { statuses });
      } else {
        queryBuilder.where('listing.status = :status', { status: dto.status });
      }
    }

    // Search filter (title or seller name)
    if (dto.search) {
      queryBuilder.andWhere(
        '(listing.title ILIKE :search OR seller.name ILIKE :search)',
        { search: `%${dto.search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const listings = await queryBuilder
      .orderBy('listing.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      listings,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateListingStatus(id: string, status: string, notes?: string): Promise<MarketplaceListing> {
    const listing = await this.getListingById(id);
    
    listing.status = status;
    if (notes) {
      listing.adminNotes = notes;
    }
    await this.listingRepository.save(listing);

    return this.getListingById(id);
  }

  async getMarketplaceFeed(dto: GetMarketplaceFeedDto): Promise<{
    listings: MarketplaceListing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      console.log('🛒 getMarketplaceFeed called with:', dto);
      const page = dto.page || 1;
      const limit = dto.limit || 10;
      const skip = (page - 1) * limit;

      // Build query
      const queryBuilder = this.listingRepository
        .createQueryBuilder('listing')
        .leftJoin('listing.seller', 'seller')
        .addSelect(['seller.id', 'seller.name', 'seller.phoneNumber', 'seller.isBanned'])
        .leftJoinAndSelect('listing.images', 'images')
        .where('listing.status = :status', { status: 'approved' })
        .andWhere('listing.isBanned = :isBanned', { isBanned: false })
        .andWhere('(seller.isBanned IS NULL OR seller.isBanned = :sellerBanned)', { sellerBanned: false });
      
      console.log('📝 Query built successfully');

    // Apply filters
    if (dto.category) {
      queryBuilder.andWhere('listing.category = :category', { category: dto.category });
    }

    if (dto.city) {
      queryBuilder.andWhere('listing.city ILIKE :city', { city: `%${dto.city}%` });
    }

    if (dto.condition) {
      queryBuilder.andWhere('listing.condition = :condition', { condition: dto.condition });
    }

    // Price range filter
    if (dto.priceMin !== undefined && dto.priceMax !== undefined) {
      queryBuilder.andWhere('listing.price BETWEEN :priceMin AND :priceMax', {
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
      });
    } else if (dto.priceMin !== undefined) {
      queryBuilder.andWhere('listing.price >= :priceMin', { priceMin: dto.priceMin });
    } else if (dto.priceMax !== undefined) {
      queryBuilder.andWhere('listing.price <= :priceMax', { priceMax: dto.priceMax });
    }

    // Search by title
    if (dto.search) {
      queryBuilder.andWhere('listing.title ILIKE :search', { search: `%${dto.search}%` });
    }

      // Get total count
      console.log('📊 Getting count...');
      const total = await queryBuilder.getCount();
      console.log(`📊 Total approved listings: ${total}`);

      // Apply pagination and ordering
      console.log('📝 Executing query...');
      const listings = await queryBuilder
        .orderBy('listing.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      console.log(`✅ Retrieved ${listings.length} listings`);

      const totalPages = Math.ceil(total / limit);

      return {
        listings,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('❌ Error in getMarketplaceFeed:', error);
      throw error;
    }
  }
}
