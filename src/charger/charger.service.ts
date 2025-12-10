import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from './entities/charger.entity';
import { CreateChargerDto } from './dto/create-charger.dto';
import { UpdateChargerDto } from './dto/update-charger.dto';
import { FilterChargersDto } from './dto/filter-chargers.dto';
import { ChargerIntegrationService } from '../charger-integration/charger-integration.service';
import { ChargersGateway } from './chargers.gateway';
import { BookingMode } from './enums/booking-mode.enum';
import { ChargerStatus } from './enums/charger-status.enum';
import { UpdateBookingModeDto } from './dto/update-booking-mode.dto';
import { UpdateChargerStatusDto } from './dto/update-charger-status.dto';
import { DEFAULT_BOOKING_SETTINGS } from './interfaces/booking-settings.interface';

@Injectable()
export class ChargerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @Inject(forwardRef(() => ChargerIntegrationService))
    private integrationService: ChargerIntegrationService,
    @Inject(forwardRef(() => ChargersGateway))
    private chargersGateway: ChargersGateway,
  ) {}

  async create(createChargerDto: CreateChargerDto, ownerId: string): Promise<any> {
    const charger = this.chargerRepository.create({
      ...createChargerDto,
      ownerId,
    });
    const savedCharger = await this.chargerRepository.save(charger);
    
    // Auto-generate OCPP credentials for the new charger
    let ocppCredentials: {
      chargeBoxIdentity: string;
      setupInstructions: string;
      wsUrl: string;
    } | null = null;
    
    try {
      ocppCredentials = await this.integrationService.generateOcppCredentials(savedCharger.id);
    } catch (error) {
      console.error('Failed to generate OCPP credentials:', error);
      // Don't fail charger creation if OCPP setup fails
    }
    
    // Reload charger to get updated OCPP fields
    const updatedCharger = await this.findOne(savedCharger.id);
    
    // Broadcast new charger via WebSocket
    try {
      this.chargersGateway.broadcastChargerUpdate(updatedCharger, 'created');
    } catch (error) {
      console.error('Failed to broadcast new charger:', error);
    }
    
    // Return charger with OCPP credentials
    return {
      ...updatedCharger,
      ocppCredentials: ocppCredentials ? {
        chargeBoxIdentity: ocppCredentials.chargeBoxIdentity,
        wsUrl: ocppCredentials.wsUrl,
        setupInstructions: ocppCredentials.setupInstructions,
      } : null,
    };
  }

  async findAll(): Promise<Charger[]> {
    return this.chargerRepository.find({
      where: { verified: true, isBanned: false },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Charger> {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException(`Charger with ID ${id} not found`);
    }

    return charger;
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<Charger[]> {
    // Simple distance calculation using Haversine formula
    // For production, consider using PostGIS extension for better performance
    const query = `
      SELECT * FROM (
        SELECT *, 
          ( 6371 * acos( 
            cos( radians($1) ) * 
            cos( radians(lat) ) * 
            cos( radians(lng) - radians($2) ) + 
            sin( radians($1) ) * 
            sin( radians(lat) ) 
          ) ) AS distance 
        FROM chargers
        WHERE verified = true AND "isBanned" = false
      ) AS chargers_with_distance
      WHERE distance < $3 
      ORDER BY distance
    `;

    return this.chargerRepository.query(query, [lat, lng, radiusKm]);
  }

  async update(id: string, updateChargerDto: UpdateChargerDto, userId: string): Promise<Charger> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    Object.assign(charger, updateChargerDto);
    const updatedCharger = await this.chargerRepository.save(charger);
    
    // Broadcast update via WebSocket
    try {
      this.chargersGateway.broadcastChargerUpdate(updatedCharger, 'updated');
    } catch (error) {
      console.error('Failed to broadcast charger update:', error);
    }
    
    return updatedCharger;
  }

  async remove(id: string, userId: string): Promise<void> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own chargers');
    }

    // Broadcast deletion before removing
    try {
      this.chargersGateway.broadcastChargerUpdate(charger, 'deleted');
    } catch (error) {
      console.error('Failed to broadcast charger deletion:', error);
    }
    
    await this.chargerRepository.remove(charger);
  }

  async findByOwner(ownerId: string): Promise<Charger[]> {
    return this.chargerRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update charger status and broadcast the change
   * @param id Charger ID
   * @param newStatus New status value
   * @returns Updated charger
   */
  async updateStatus(id: string, newStatus: 'available' | 'in-use' | 'offline'): Promise<Charger> {
    const charger = await this.findOne(id);
    
    const oldStatus = charger.status;
    charger.status = newStatus;
    const updatedCharger = await this.chargerRepository.save(charger);
    
    // Broadcast status change via WebSocket
    try {
      this.chargersGateway.broadcastChargerUpdate(updatedCharger, 'updated');
      this.chargersGateway.broadcastAvailabilityChange(
        updatedCharger.id, 
        newStatus === 'available',
        { lat: updatedCharger.lat, lng: updatedCharger.lng }
      );
    } catch (error) {
      console.error('Failed to broadcast status change:', error);
    }
    
    return updatedCharger;
  }

  /**
   * Filter chargers with advanced criteria
   */
  async filterChargers(filters: FilterChargersDto): Promise<any> {
    const query = this.chargerRepository.createQueryBuilder('charger')
      .leftJoinAndSelect('charger.owner', 'owner')
      .where('charger.verified = :verified', { verified: true });

    // Location filters (if provided)
    if (filters.lat && filters.lng) {
      const radius = filters.radius || 10;
      query.addSelect(
        `( 6371 * acos( 
          cos( radians(${filters.lat}) ) * 
          cos( radians(charger.lat) ) * 
          cos( radians(charger.lng) - radians(${filters.lng}) ) + 
          sin( radians(${filters.lat}) ) * 
          sin( radians(charger.lat) ) 
        ) )`,
        'distance'
      );
      query.having('distance < :radius', { radius });
    }

    // Power filters
    if (filters.minPowerKw) {
      query.andWhere('charger.powerKw >= :minPowerKw', { minPowerKw: filters.minPowerKw });
    }
    if (filters.maxPowerKw) {
      query.andWhere('charger.powerKw <= :maxPowerKw', { maxPowerKw: filters.maxPowerKw });
    }

    // Speed type filters
    if (filters.speedTypes && filters.speedTypes.length > 0) {
      query.andWhere('charger.speedType IN (:...speedTypes)', { speedTypes: filters.speedTypes });
    }

    // Connector type filters
    if (filters.connectorTypes && filters.connectorTypes.length > 0) {
      query.andWhere('charger.connectorType IN (:...connectorTypes)', { connectorTypes: filters.connectorTypes });
    }

    // Price filters
    if (filters.minPrice) {
      query.andWhere('charger.pricePerKwh >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice) {
      query.andWhere('charger.pricePerKwh <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    // Availability filter
    if (filters.availableNow) {
      query.andWhere('charger.status = :status', { status: 'available' });
    }

    // Access type filters
    if (filters.accessTypes && filters.accessTypes.length > 0) {
      query.andWhere('charger.accessType IN (:...accessTypes)', { accessTypes: filters.accessTypes });
    }

    // Booking mode filters
    if (filters.bookingModes && filters.bookingModes.length > 0) {
      query.andWhere('charger.bookingMode IN (:...bookingModes)', { bookingModes: filters.bookingModes });
    }

    // Sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'distance':
          if (filters.lat && filters.lng) {
            query.orderBy('distance', filters.sortOrder === 'desc' ? 'DESC' : 'ASC');
          }
          break;
        case 'price':
          query.orderBy('charger.pricePerKwh', filters.sortOrder === 'desc' ? 'DESC' : 'ASC');
          break;
        case 'power':
          query.orderBy('charger.powerKw', filters.sortOrder === 'desc' ? 'DESC' : 'ASC');
          break;
        default:
          query.orderBy('charger.createdAt', 'DESC');
      }
    } else {
      query.orderBy('charger.createdAt', 'DESC');
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query.take(limit).skip(offset);

    const [chargers, total] = await query.getManyAndCount();

    return {
      data: chargers,
      total,
      limit,
      offset,
      hasMore: offset + chargers.length < total,
    };
  }

  /**
   * Update booking mode for a charger
   * @param id Charger ID
   * @param updateDto Booking mode update data
   * @param userId Owner user ID for authorization
   * @returns Updated charger
   */
  async updateBookingMode(
    id: string, 
    updateDto: UpdateBookingModeDto, 
    userId: string
  ): Promise<Charger> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    // Validate booking mode settings
    this.validateBookingMode(updateDto);

    // Update booking mode
    charger.bookingMode = updateDto.bookingMode;
    
    // Update settings if provided, otherwise use defaults
    if (updateDto.bookingSettings) {
      charger.bookingSettings = updateDto.bookingSettings;
    } else if (!charger.bookingSettings) {
      charger.bookingSettings = DEFAULT_BOOKING_SETTINGS;
    }

    const updatedCharger = await this.chargerRepository.save(charger);
    
    // Broadcast update via WebSocket
    try {
      this.chargersGateway.broadcastChargerUpdate(updatedCharger, 'updated');
    } catch (error) {
      console.error('Failed to broadcast booking mode update:', error);
    }
    
    return updatedCharger;
  }

  /**
   * Validate booking mode and settings
   */
  private validateBookingMode(updateDto: UpdateBookingModeDto): void {
    if (!updateDto.bookingSettings) {
      return; // Will use defaults
    }

    const settings = updateDto.bookingSettings;

    // Validate min/max booking duration
    if (settings.minBookingMinutes >= settings.maxBookingMinutes) {
      throw new BadRequestException(
        'Minimum booking duration must be less than maximum duration'
      );
    }

    // Validate pre-booking requirements
    if (updateDto.bookingMode === BookingMode.PRE_BOOKING_REQUIRED && 
        settings.advanceBookingDays === 0) {
      throw new BadRequestException(
        'Pre-booking required mode must allow advance bookings'
      );
    }
  }

  /**
   * Update charger status (available, occupied, reserved, maintenance, offline)
   * @param id Charger ID
   * @param updateDto Status update data
   * @param userId Owner user ID for authorization
   * @returns Updated charger
   */
  async updateChargerStatus(
    id: string, 
    updateDto: UpdateChargerStatusDto, 
    userId: string
  ): Promise<Charger> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    // Check if charger is verified
    if (!charger.verified) {
      throw new ForbiddenException('Cannot change status of unverified charger. Please wait for admin approval.');
    }

    const oldStatus = charger.currentStatus;
    charger.currentStatus = updateDto.status;
    charger.lastStatusUpdate = new Date();

    const updatedCharger = await this.chargerRepository.save(charger);
    
    // Broadcast status change via WebSocket
    try {
      this.chargersGateway.broadcastChargerUpdate(updatedCharger, 'updated');
      this.chargersGateway.broadcastAvailabilityChange(
        updatedCharger.id, 
        updateDto.status === ChargerStatus.AVAILABLE,
        { lat: updatedCharger.lat, lng: updatedCharger.lng }
      );
    } catch (error) {
      console.error('Failed to broadcast status change:', error);
    }
    
    return updatedCharger;
  }

  /**
   * Get available chargers filtered by booking mode
   * @param bookingMode Optional filter by booking mode
   * @param lat Optional latitude for distance calculation
   * @param lng Optional longitude for distance calculation
   * @param radiusKm Optional radius in kilometers
   * @returns Available chargers
   */
  async getAvailableChargers(
    bookingMode?: BookingMode,
    lat?: number,
    lng?: number,
    radiusKm: number = 10
  ): Promise<Charger[]> {
    const queryBuilder = this.chargerRepository.createQueryBuilder('charger')
      .leftJoinAndSelect('charger.owner', 'owner')
      .where('charger.verified = :verified', { verified: true })
      .andWhere('charger.currentStatus = :status', { status: ChargerStatus.AVAILABLE });

    // Filter by booking mode if specified
    if (bookingMode) {
      queryBuilder.andWhere('charger.bookingMode = :bookingMode', { bookingMode });
    }

    // Location filter if coordinates provided
    if (lat && lng) {
      queryBuilder.addSelect(
        `( 6371 * acos( 
          cos( radians(${lat}) ) * 
          cos( radians(charger.lat) ) * 
          cos( radians(charger.lng) - radians(${lng}) ) + 
          sin( radians(${lat}) ) * 
          sin( radians(charger.lat) ) 
        ) )`,
        'distance'
      );
      queryBuilder.having('distance < :radius', { radius: radiusKm });
      queryBuilder.orderBy('distance', 'ASC');
    } else {
      queryBuilder.orderBy('charger.createdAt', 'DESC');
    }

    return queryBuilder.getMany();
  }
}
