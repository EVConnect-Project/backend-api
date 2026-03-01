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
import { ChargingStation } from '../owner/entities/charging-station.entity';

@Injectable()
export class ChargerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(ChargingStation)
    private stationRepository: Repository<ChargingStation>,
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
    const query = `
      SELECT c.*, cs.station_name AS "stationName"
      FROM chargers c
      LEFT JOIN charging_stations cs ON c."stationId" = cs.id
      WHERE c.verified = true AND c."isBanned" = false
      ORDER BY c."createdAt" DESC
    `;
    return this.chargerRepository.query(query);
  }

  async findOne(id: string): Promise<Charger> {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ['owner', 'sockets'],
    });

    if (!charger) {
      throw new NotFoundException(`Charger with ID ${id} not found`);
    }

    return charger;
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<Charger[]> {
    // Simple distance calculation using Haversine formula
    // Includes stationName via LEFT JOIN so clients can display "Station · Charger" labels
    const query = `
      SELECT cwd.*, cs.station_name AS "stationName"
      FROM (
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
      ) AS cwd
      LEFT JOIN charging_stations cs ON cwd."stationId" = cs.id
      WHERE cwd.distance < $3 
      ORDER BY cwd.distance
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
      relations: ['sockets'],
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
      .leftJoinAndSelect('charger.sockets', 'sockets')
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

  async filterStations(filters: any): Promise<any> {
    try {
      console.log('filterStations called with filters:', filters);
      
      // Get all verified chargers with their sockets and owner
      const chargers = await this.chargerRepository.find({
        where: { verified: true, isBanned: false },
        relations: ['sockets', 'owner'],
      });
      
      console.log(`Found ${chargers.length} verified chargers`);

      // Apply location filter
      let filteredChargers: any[] = chargers;

      if (filters.lat && filters.lng) {
        const radius = filters.radius || 50;
        filteredChargers = filteredChargers.map(charger => {
          const distance = this.calculateDistance(
            filters.lat, filters.lng,
            parseFloat(charger.lat), 
            parseFloat(charger.lng)
          );
          return { ...charger, distance };
        }).filter(charger => charger.distance < radius);
      }

      // Apply charger type filter
      if (filters.chargerType) {
        filteredChargers = filteredChargers.filter(c => 
          c.chargerType === filters.chargerType || c.speedType?.includes(filters.chargerType)
        );
      }

      // Apply availability filter
      if (filters.availableNow) {
        filteredChargers = filteredChargers.filter(c => c.status === 'available');
      }

      // Apply connector type filter
      if (filters.connectorTypes && filters.connectorTypes.length > 0) {
        filteredChargers = filteredChargers.filter(c => {
          if (c.sockets && c.sockets.length > 0) {
            return c.sockets.some((s: any) => filters.connectorTypes.includes(s.connectorType));
          }
          return filters.connectorTypes.includes(c.connectorType);
        });
      }

      // Group chargers by stationId
      const stationMap: Record<string, any[]> = {};
      const individualChargers: any[] = [];
      
      for (const charger of filteredChargers) {
        if (charger.stationId) {
          if (!stationMap[charger.stationId]) {
            stationMap[charger.stationId] = [];
          }
          stationMap[charger.stationId].push(charger);
        } else {
          individualChargers.push(charger);
        }
      }

      // Fetch station metadata from charging_stations table
      const stationIds = Object.keys(stationMap);
      let stationMetadata: Record<string, any> = {};
      
      if (stationIds.length > 0) {
        const stationRecords = await this.stationRepository
          .createQueryBuilder('s')
          .where('s.id IN (:...ids)', { ids: stationIds })
          .getMany();
        
        for (const s of stationRecords) {
          stationMetadata[s.id] = s;
        }
      }

      // Build station objects with nested chargers
      const stations = Object.entries(stationMap).map(([stationId, stationChargers]) => {
        const meta = stationMetadata[stationId];
        const firstCharger = stationChargers[0];
        
        // Collect all unique connector types across all chargers/sockets
        const connectorTypes = new Set<string>();
        let totalSockets = 0;
        let availableSockets = 0;
        let minPrice = Infinity;
        let maxPower = 0;
        
        for (const charger of stationChargers) {
          if (charger.sockets && charger.sockets.length > 0) {
            for (const socket of charger.sockets) {
              connectorTypes.add(socket.connectorType);
              totalSockets++;
              if (socket.status === 'available') availableSockets++;
              const price = parseFloat(socket.pricePerKwh || socket.pricePerHour || '0');
              if (price > 0 && price < minPrice) minPrice = price;
              const power = parseFloat(socket.maxPowerKw || '0');
              if (power > maxPower) maxPower = power;
            }
          } else {
            if (charger.connectorType) connectorTypes.add(charger.connectorType);
            totalSockets++;
            if (charger.status === 'available') availableSockets++;
            const price = parseFloat(charger.pricePerKwh || '0');
            if (price > 0 && price < minPrice) minPrice = price;
            const power = parseFloat(charger.maxPowerKw || charger.powerKw || '0');
            if (power > maxPower) maxPower = power;
          }
        }

        if (minPrice === Infinity) minPrice = 0;

        // Compute distance from first charger (all chargers in a station share location)
        const distance = firstCharger.distance ?? null;

        return {
          id: stationId,
          type: 'station',
          ownerId: meta?.ownerId || firstCharger.ownerId,
          stationName: meta?.stationName || firstCharger.name || 'Charging Station',
          address: meta?.address || firstCharger.address || '',
          lat: parseFloat(meta?.lat || firstCharger.lat),
          lng: parseFloat(meta?.lng || firstCharger.lng),
          stationType: meta?.stationType || 'public',
          parkingCapacity: meta?.parkingCapacity || null,
          description: meta?.description || firstCharger.description || null,
          amenities: meta?.amenities || [],
          openingHours: meta?.openingHours || firstCharger.openingHours || { is24Hours: true },
          images: meta?.images || [],
          verified: meta?.verified ?? firstCharger.verified,
          isBanned: meta?.isBanned ?? false,
          createdAt: meta?.createdAt || firstCharger.createdAt,
          updatedAt: meta?.updatedAt || firstCharger.updatedAt,
          distance,
          connectorTypes: Array.from(connectorTypes),
          totalSockets,
          availableSockets,
          minPrice,
          maxPowerKw: maxPower,
          chargers: stationChargers.map(c => ({
            id: c.id,
            ownerId: c.ownerId,
            lat: parseFloat(c.lat),
            lng: parseFloat(c.lng),
            stationId: c.stationId,
            chargerName: c.name || c.chargerIdentifier || 'Charger',
            chargerIdentifier: c.chargerIdentifier,
            chargerType: c.chargerType,
            maxPowerKw: parseFloat(c.maxPowerKw || c.powerKw || '0'),
            powerKw: parseFloat(c.powerKw || c.maxPowerKw || '0'),
            pricePerKwh: parseFloat(c.pricePerKwh || '0'),
            connectorType: c.connectorType,
            speedType: c.speedType,
            status: c.status,
            currentStatus: c.currentStatus,
            verified: c.verified ?? false,
            name: c.name,
            address: c.address,
            description: c.description,
            bookingMode: c.bookingMode,
            bookingSettings: c.bookingSettings,
            phoneNumber: c.phoneNumber,
            amenities: c.amenities,
            openingHours: c.openingHours,
            isOnline: c.isOnline ?? false,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            sockets: (c.sockets || []).map((s: any) => ({
              id: s.id,
              chargerId: s.chargerId || c.id,
              socketNumber: s.socketNumber,
              socketLabel: s.socketLabel,
              connectorType: s.connectorType,
              maxPowerKw: parseFloat(s.maxPowerKw || '0'),
              pricePerKwh: s.pricePerKwh ? parseFloat(s.pricePerKwh) : null,
              pricePerHour: s.pricePerHour ? parseFloat(s.pricePerHour) : null,
              isFree: s.isFree || false,
              currentStatus: s.status,
              bookingMode: s.bookingMode,
              isOccupied: s.occupiedBy ? true : false,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            })),
          })),
        };
      });

      // Build individual charger objects (chargers without stationId)
      const individuals = individualChargers.map(c => {
        const sockets = c.sockets || [];
        let totalSockets = sockets.length || 1;
        let availableSockets = sockets.filter((s: any) => s.status === 'available').length;
        if (sockets.length === 0 && c.status === 'available') availableSockets = 1;
        
        const connectorTypes = new Set<string>();
        if (sockets.length > 0) {
          sockets.forEach((s: any) => connectorTypes.add(s.connectorType));
        } else if (c.connectorType) {
          connectorTypes.add(c.connectorType);
        }
        
        return {
          id: c.id,
          type: 'individual',
          ownerId: c.ownerId,
          stationName: c.name || 'Individual Charger',
          address: c.address || '',
          lat: parseFloat(c.lat),
          lng: parseFloat(c.lng),
          stationType: 'individual',
          description: c.description || null,
          amenities: c.amenities ? Object.entries(c.amenities).filter(([_, v]) => v).map(([k]) => k) : [],
          openingHours: c.openingHours || { is24Hours: true },
          verified: c.verified,
          distance: c.distance ?? null,
          connectorTypes: Array.from(connectorTypes),
          totalSockets,
          availableSockets,
          minPrice: parseFloat(c.pricePerKwh || '0'),
          maxPowerKw: parseFloat(c.maxPowerKw || c.powerKw || '0'),
          chargers: [{
            id: c.id,
            ownerId: c.ownerId,
            lat: parseFloat(c.lat),
            lng: parseFloat(c.lng),
            stationId: c.stationId,
            chargerName: c.name || 'Charger',
            chargerIdentifier: c.chargerIdentifier,
            chargerType: c.chargerType,
            maxPowerKw: parseFloat(c.maxPowerKw || c.powerKw || '0'),
            powerKw: parseFloat(c.powerKw || c.maxPowerKw || '0'),
            pricePerKwh: parseFloat(c.pricePerKwh || '0'),
            connectorType: c.connectorType,
            speedType: c.speedType,
            status: c.status,
            currentStatus: c.currentStatus,
            verified: c.verified ?? false,
            name: c.name,
            address: c.address,
            description: c.description,
            bookingMode: c.bookingMode,
            bookingSettings: c.bookingSettings,
            phoneNumber: c.phoneNumber,
            amenities: c.amenities,
            openingHours: c.openingHours,
            isOnline: c.isOnline ?? false,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            sockets: sockets.map((s: any) => ({
              id: s.id,
              chargerId: s.chargerId || c.id,
              socketNumber: s.socketNumber,
              socketLabel: s.socketLabel,
              connectorType: s.connectorType,
              maxPowerKw: parseFloat(s.maxPowerKw || '0'),
              pricePerKwh: s.pricePerKwh ? parseFloat(s.pricePerKwh) : null,
              pricePerHour: s.pricePerHour ? parseFloat(s.pricePerHour) : null,
              isFree: s.isFree || false,
              currentStatus: s.status,
              bookingMode: s.bookingMode,
              isOccupied: s.occupiedBy ? true : false,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            })),
          }],
        };
      });

      // Merge all results
      let allResults = [...stations, ...individuals];

      // Sort by distance if location filter applied
      if (filters.lat && filters.lng) {
        allResults.sort((a, b) => {
          const da = a.distance ?? 999999;
          const db = b.distance ?? 999999;
          return filters.sortOrder === 'desc' ? db - da : da - db;
        });
      }

      // Pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const total = allResults.length;
      const paginatedResults = allResults.slice(offset, offset + limit);

      console.log(`Returning ${paginatedResults.length} stations/chargers of ${total} total`);

      return {
        data: paginatedResults,
        total,
        limit,
        offset,
        hasMore: offset + paginatedResults.length < total,
      };
    } catch (error) {
      console.error('Error in filterStations:', error);
      throw error;
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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
    if (updateDto.bookingMode === BookingMode.PRE_BOOKING && 
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
