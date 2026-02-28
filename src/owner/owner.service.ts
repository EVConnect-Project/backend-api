import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateChargerDto } from '../charger/dto/create-charger.dto';
import { UpdateChargerDto } from '../charger/dto/update-charger.dto';
import { CreateIndividualChargerDto } from './dto/create-individual-charger.dto';
import { CreateStationDto } from './dto/create-station.dto';
import { ChargerSocket } from './entities/charger-socket.entity';
import { ChargingStation } from './entities/charging-station.entity';
import { BookingMode } from '../charger/enums/booking-mode.enum';
import { Station } from '../station/entities/station.entity';

@Injectable()
export class OwnerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ChargerSocket)
    private socketRepository: Repository<ChargerSocket>,
    @InjectRepository(ChargingStation)
    private stationRepository: Repository<ChargingStation>,
    @InjectRepository(Station)
    private stationEntityRepository: Repository<Station>,
    private dataSource: DataSource,
  ) {}

  /**
   * Register a new charger and upgrade user to 'owner' role if needed
   * Note: If user is already a mechanic, they keep mechanic role but can still own chargers
   */
  /**
   * Get all chargers owned by a user
   */
  async getMyChargers(ownerId: string) {
    try {
      console.log(`[OwnerService] Fetching chargers for owner: ${ownerId}`);

      // 1. Fetch chargers without eager loading station (table might not exist)
      const chargers = await this.chargerRepository.find({
        where: { ownerId },
        relations: ['sockets'],
        order: { createdAt: 'DESC' },
      });

      console.log(`[OwnerService] Found ${chargers.length} chargers.`);

      if (chargers.length === 0) {
        console.log('[OwnerService] No chargers found, returning empty array.');
        return [];
      }

      const chargerIds = chargers.map((charger) => charger.id);
      console.log(`[OwnerService] Charger IDs: ${chargerIds.join(', ')}`);

      // 2. Fetch booking statistics in a single efficient query
      let bookingStats = [];
      if (chargerIds.length > 0) {
        console.log('[OwnerService] Fetching booking statistics...');
        bookingStats = await this.bookingRepository
          .createQueryBuilder('booking')
          .select('booking.chargerId', 'chargerId')
          .addSelect('COUNT(booking.id)', 'totalBookings')
          .addSelect(
            "SUM(CASE WHEN booking.status = 'active' THEN 1 ELSE 0 END)",
            'activeBookings',
          )
          .addSelect(
            "SUM(CASE WHEN booking.status = 'pending' THEN 1 ELSE 0 END)",
            'pendingBookings',
          )
          .where('booking.chargerId IN (:...chargerIds)', { chargerIds })
          .groupBy('booking.chargerId')
          .getRawMany();
        console.log(`[OwnerService] Retrieved stats for ${bookingStats.length} chargers.`);
      }

      // 3. Create a lookup map for quick access to stats
      const statsMap = new Map(
        bookingStats.map((stat: any) => [
          stat.chargerId,
          {
            totalBookings: parseInt(stat.totalBookings, 10) || 0,
            activeBookings: parseInt(stat.activeBookings, 10) || 0,
            pendingBookings: parseInt(stat.pendingBookings, 10) || 0,
          },
        ]),
      );

      // 4. Manually and safely construct the final response object (without station)
      const chargersWithStats = chargers.map((charger) => {
        const stats =
          statsMap.get(charger.id) ||
          { totalBookings: 0, activeBookings: 0, pendingBookings: 0 };
        return {
          id: charger.id,
          name: charger.name,
          address: charger.address,
          latitude: charger.lat,
          longitude: charger.lng,
          status: charger.status,
          power: charger.maxPowerKw,
          price: charger.pricePerKwh,
          verified: charger.verified,
          isPublic: true,
          bookingMode: charger.bookingMode,
          ownerId: charger.ownerId,
          stationId: charger.stationId,
          createdAt: charger.createdAt,
          updatedAt: charger.updatedAt,
          sockets: charger.sockets ? charger.sockets : [],
          stats: stats,
        };
      });

      console.log(
        '[OwnerService] Successfully processed chargers with stats.',
      );
      return chargersWithStats;
    } catch (error) {
      console.error(
        '❌ [OwnerService] Critical error in getMyChargers:',
        error.message,
        error.stack,
      );
      // Throw a standard NestJS exception
      throw new InternalServerErrorException(
        `A critical error occurred while fetching charger data: ${error.message}`,
      );
    }
  }

  /**
   * Get specific charger details (ownership verification)
   */
  async getChargerById(id: string, ownerId: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only view your own chargers');
    }

    // Get booking statistics
    const totalBookings = await this.bookingRepository.count({
      where: { chargerId: id },
    });

    const completedBookings = await this.bookingRepository.count({
      where: { chargerId: id, status: 'completed' },
    });

    const totalRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.price)', 'total')
      .where('booking.chargerId = :chargerId', { chargerId: id })
      .andWhere('booking.status = :status', { status: 'completed' })
      .getRawOne();

    return {
      ...charger,
      stats: {
        totalBookings,
        completedBookings,
        totalRevenue: parseFloat(totalRevenue?.total || '0'),
      },
    };
  }

  /**
   * Update charger details (ownership verification)
   */
  async updateCharger(
    id: string,
    updateChargerDto: UpdateChargerDto,
    ownerId: string,
  ) {
    const charger = await this.chargerRepository.findOne({ where: { id } });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    if (!charger.verified) {
      throw new ForbiddenException('Cannot update unverified charger. Please wait for admin approval.');
    }

    Object.assign(charger, updateChargerDto);
    return this.chargerRepository.save(charger);
  }

  /**
   * Update charger status
   */
  async updateChargerStatus(
    id: string,
    status: 'available' | 'in-use' | 'offline',
    ownerId: string,
  ) {
    const charger = await this.chargerRepository.findOne({ where: { id } });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    if (!charger.verified) {
      throw new ForbiddenException('Cannot change status of unverified charger. Please wait for admin approval.');
    }

    charger.status = status;
    const updated = await this.chargerRepository.save(charger);

    return {
      ...updated,
      message: `Charger status updated to ${status}`,
    };
  }

  /**
   * Delete/deactivate charger
   */
  async deleteCharger(id: string, ownerId: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only delete your own chargers');
    }

    // Check for active bookings
    const activeBookings = await this.bookingRepository.count({
      where: { chargerId: id, status: 'active' },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        'Cannot delete charger with active bookings',
      );
    }

    // Hard delete - permanently remove the charger
    await this.chargerRepository.remove(charger);

    return { message: 'Charger deleted successfully' };
  }

  /**
   * Get all bookings for chargers owned by user
   */
  async getBookingsForMyChargers(
    ownerId: string,
    status?: string,
    chargerId?: string,
  ) {
    const whereConditions: any = {};

    // First, get all charger IDs owned by this user
    const myChargers = await this.chargerRepository.find({
      where: { ownerId },
      select: ['id'],
    });

    const chargerIds = myChargers.map((c) => c.id);

    if (chargerIds.length === 0) {
      return [];
    }

    // Filter by specific charger if provided
    if (chargerId) {
      // Verify ownership
      if (!chargerIds.includes(chargerId)) {
        throw new ForbiddenException('Charger not found or not owned by you');
      }
      whereConditions.chargerId = chargerId;
    } else {
      // Get bookings for all owned chargers
      whereConditions.chargerId = In(chargerIds);
    }

    if (status) {
      whereConditions.status = status;
    }

    const bookings = await this.bookingRepository.find({
      where: whereConditions,
      relations: ['user', 'charger'],
      order: { createdAt: 'DESC' },
    });

    return bookings;
  }

  /**
   * Get specific booking details (ownership verification)
   */
  async getBookingById(id: string, ownerId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'charger'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify the charger is owned by this user
    if (booking.charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only view bookings for your own chargers');
    }

    return booking;
  }

  /**
   * Delete a pending booking (ownership verification)
   */
  async deletePendingBooking(id: string, ownerId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['charger'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify the charger is owned by this user
    if (booking.charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only delete bookings for your own chargers');
    }

    // Only allow deleting pending bookings
    if (booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be deleted. This booking is ' + booking.status);
    }

    // Delete the booking
    await this.bookingRepository.remove(booking);

    return { message: 'Booking deleted successfully' };
  }

  /**
   * Get booking statistics for owned chargers
   */
  async getBookingStats(ownerId: string) {
    const myChargers = await this.chargerRepository.find({
      where: { ownerId },
      select: ['id'],
    });

    const chargerIds = myChargers.map((c) => c.id);

    if (chargerIds.length === 0) {
      return {
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
      };
    }

    const totalBookings = await this.bookingRepository.count({
      where: { chargerId: In(chargerIds) },
    });

    const activeBookings = await this.bookingRepository.count({
      where: { chargerId: In(chargerIds), status: 'active' },
    });

    const completedBookings = await this.bookingRepository.count({
      where: { chargerId: In(chargerIds), status: 'completed' },
    });

    const cancelledBookings = await this.bookingRepository.count({
      where: { chargerId: In(chargerIds), status: 'cancelled' },
    });

    const pendingBookings = await this.bookingRepository.count({
      where: { chargerId: In(chargerIds), status: 'pending' },
    });

    return {
      totalBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(
    ownerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const myChargers = await this.chargerRepository.find({
      where: { ownerId },
      select: ['id'],
    });

    const chargerIds = myChargers.map((c) => c.id);

    if (chargerIds.length === 0) {
      return {
        totalRevenue: 0,
        completedBookingsRevenue: 0,
        pendingRevenue: 0,
      };
    }

    let query = this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId IN (:...chargerIds)', { chargerIds });

    if (startDate && endDate) {
      query = query.andWhere('booking.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const totalRevenue = await query
      .select('SUM(booking.price)', 'total')
      .getRawOne();

    const completedRevenue = await query
      .andWhere('booking.status = :status', { status: 'completed' })
      .select('SUM(booking.price)', 'total')
      .getRawOne();

    const pendingRevenue = await query
      .andWhere('booking.status = :status', { status: 'pending' })
      .select('SUM(booking.price)', 'total')
      .getRawOne();

    return {
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
      completedBookingsRevenue: parseFloat(completedRevenue?.total || '0'),
      pendingRevenue: parseFloat(pendingRevenue?.total || '0'),
    };
  }

  /**
   * Get charger utilization statistics
   */
  async getUtilizationStats(ownerId: string) {
    const myChargers = await this.chargerRepository.find({
      where: { ownerId },
    });

    const stats = await Promise.all(
      myChargers.map(async (charger) => {
        const totalBookings = await this.bookingRepository.count({
          where: { chargerId: charger.id },
        });

        const completedBookings = await this.bookingRepository.count({
          where: { chargerId: charger.id, status: 'completed' },
        });

        // Calculate total hours booked
        const bookings = await this.bookingRepository.find({
          where: { chargerId: charger.id, status: 'completed' },
        });

        const totalHoursBooked = bookings.reduce((sum, booking) => {
          const hours =
            (new Date(booking.endTime).getTime() -
              new Date(booking.startTime).getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }, 0);

        return {
          chargerId: charger.id,
          chargerName: charger.name,
          totalBookings,
          completedBookings,
          totalHoursBooked: parseFloat(totalHoursBooked.toFixed(2)),
          status: charger.status,
          verified: charger.verified,
        };
      }),
    );

    return stats;
  }

  /**
   * Register an individual charger with sockets configuration
   * Parses location URL to extract lat/lng coordinates
   */
  async registerIndividualCharger(
    dto: CreateIndividualChargerDto,
    userId: string,
  ) {
    try {
      console.log('=== REGISTER INDIVIDUAL CHARGER START ===');
      console.log('User ID:', userId);
      console.log('DTO received:', JSON.stringify(dto, null, 2));
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('User not found with ID:', userId);
        throw new NotFoundException('User not found');
      }
      console.log('User found:', user.phoneNumber, 'Role:', user.role);

      // Upgrade to owner role if needed
      if (user.role === 'user') {
        console.log('Upgrading user to owner role');
        user.role = 'owner';
        await this.userRepository.save(user);
        console.log('User role upgraded successfully');
      }

      // Parse location URL to extract coordinates
      console.log('Parsing location URL:', dto.locationUrl);
      const { lat, lng, address } = this.parseLocationUrl(dto.locationUrl);
      console.log('Parsed coordinates:', { lat, lng, address });

      // Validate maxPowerKw
      if (!dto.maxPowerKw || dto.maxPowerKw <= 0) {
        console.error('Invalid maxPowerKw:', dto.maxPowerKw);
        throw new BadRequestException(
          'Invalid power rating. Please ensure maxPowerKw is a positive number.',
        );
      }
      console.log('maxPowerKw validated:', dto.maxPowerKw);

      // Validate sockets
      if (!dto.sockets || dto.sockets.length === 0) {
        console.error('No sockets provided');
        throw new BadRequestException('At least one socket must be configured');
      }
      console.log('Sockets validated:', dto.sockets.length);

      // Use transaction to ensure atomicity
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        console.log('Starting database transaction');
        
        // Determine charger speed and connector type from sockets
        const firstSocket = dto.sockets[0];
        console.log('First socket:', JSON.stringify(firstSocket, null, 2));
        
        const speedType = this.determineSpeedType(dto.chargerType, dto.maxPowerKw);
        console.log('Determined speed type:', speedType);
        
        const connectorType = firstSocket.connectorType;
        console.log('Connector type:', connectorType);

        // Create main charger entity
        console.log('Creating charger entity with data:', {
          ownerId: userId,
          name: dto.chargerName,
          lat,
          lng,
          powerKw: dto.maxPowerKw,
          speedType,
          connectorType,
          numberOfPlugs: dto.sockets.length,
        });
        
      const charger = queryRunner.manager.create(Charger, {
        ownerId: userId,
        name: dto.chargerName,
        lat,
        lng,
        address,
        chargerType: dto.chargerType,
        maxPowerKw: dto.maxPowerKw,
        powerKw: dto.maxPowerKw,
        pricePerKwh: firstSocket.pricePerKwh || firstSocket.pricePerHour || 0,
        speedType,
        connectorType,
        numberOfPlugs: dto.sockets.length,
        description: dto.description,
        phoneNumber: dto.phoneNumber || null,
        bookingMode: (dto.bookingMode as BookingMode) || BookingMode.HYBRID,
        openingHours: dto.openingHours || { is24Hours: true, schedule: {} },
        verified: false,
        status: 'offline',
      });        console.log('Saving charger to database...');
        const savedCharger = await queryRunner.manager.save(charger);
        console.log('Charger saved successfully. ID:', savedCharger.id);

        // Create socket entities
        console.log('Creating socket entities. Count:', dto.sockets.length);
        const sockets = dto.sockets.map((socketDto, index) => {
          console.log(`Creating socket ${index + 1}:`, JSON.stringify(socketDto, null, 2));
          return queryRunner.manager.create(ChargerSocket, {
            chargerId: savedCharger.id,
            socketNumber: socketDto.socketNumber,
            socketLabel: socketDto.socketLabel,
            connectorType: socketDto.connectorType,
            maxPowerKw: socketDto.maxPowerKw,
            pricePerKwh: socketDto.pricePerKwh,
            pricePerHour: socketDto.pricePerHour,
            isFree: socketDto.isFree || false,
            bookingMode: socketDto.bookingMode || BookingMode.HYBRID,
            status: 'available',
          });
        });

        console.log('Saving sockets to database...');
        await queryRunner.manager.save(sockets);
        console.log('Sockets saved successfully. Count:', sockets.length);

        console.log('Committing transaction...');
        await queryRunner.commitTransaction();
        console.log('Transaction committed successfully');

        // Return charger with sockets for compatibility
        return {
          ...savedCharger,
          sockets,
          message: 'Individual charger registered successfully. Awaiting admin approval.',
          needsApproval: true,
        };
      } catch (error) {
        console.error('=== TRANSACTION ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        await queryRunner.rollbackTransaction();
        console.log('Transaction rolled back');
        throw error;
      } finally {
        await queryRunner.release();
        console.log('Database connection released');
      }
    } catch (error) {
      console.error('=== FATAL ERROR IN registerIndividualCharger ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.response && error.status) {
        // This is already an HTTP exception, rethrow it
        throw error;
      }
      
      // Wrap unknown errors in InternalServerErrorException with details
      throw new InternalServerErrorException({
        message: 'Failed to register charger',
        error: error.message,
        details: error.stack,
      });
    }
  }

  /**
   * Register a charging station with multiple chargers
   * Creates station entity and all associated chargers with sockets
   */
  async registerStation(dto: CreateStationDto, userId: string) {
    console.log('🏢 registerStation called with userId:', userId);
    console.log('📝 Station DTO:', JSON.stringify(dto, null, 2));
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upgrade to owner role if needed
    if (user.role === 'user') {
      user.role = 'owner';
      await this.userRepository.save(user);
    }

    // Parse location URL
    const { lat, lng, address } = this.parseLocationUrl(dto.locationUrl);
    console.log('📍 Parsed location:', { lat, lng, address });

    // Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create station entity
      const station = queryRunner.manager.create(ChargingStation, {
        ownerId: userId,
        stationName: dto.stationName,
        locationUrl: dto.locationUrl,
        stationType: dto.stationType || 'public',
        lat,
        lng,
        address,
        parkingCapacity: dto.parkingCapacity,
        description: dto.description,
        amenities: dto.amenities || [],
        openingHours: dto.openingHours || { is24Hours: true, schedule: {} },
        images: dto.images || [],
        verified: false,
      });

      const savedStation = await queryRunner.manager.save(station);

      // Create chargers and sockets
      const chargersWithSockets: Array<{
        charger: Charger;
        sockets: ChargerSocket[];
      }> = [];

      for (const chargerDto of dto.chargers) {
        const firstSocket = chargerDto.sockets[0];
        const speedType = this.determineSpeedType(
          chargerDto.chargerType,
          chargerDto.maxPowerKw,
        );

        // Create charger entity
        const charger = queryRunner.manager.create(Charger, {
          ownerId: userId,
          stationId: savedStation.id,
          name: chargerDto.chargerName,
          chargerIdentifier: chargerDto.chargerIdentifier,
          lat,
          lng,
          address,
          chargerType: chargerDto.chargerType,
          maxPowerKw: chargerDto.maxPowerKw,
          powerKw: chargerDto.maxPowerKw,
          pricePerKwh: firstSocket.pricePerKwh || firstSocket.pricePerHour || 0,
          speedType,
          connectorType: firstSocket.connectorType,
          numberOfPlugs: chargerDto.sockets.length,
          phoneNumber: dto.phoneNumber || null,
          bookingMode: (chargerDto.bookingMode as BookingMode) || BookingMode.HYBRID,
          openingHours: dto.openingHours || { is24Hours: true, schedule: {} },
          verified: false,
          status: 'offline',
        });

        const savedCharger = await queryRunner.manager.save(charger);

        // Create sockets for this charger
        const sockets = chargerDto.sockets.map((socketDto) =>
          queryRunner.manager.create(ChargerSocket, {
            chargerId: savedCharger.id,
            socketNumber: socketDto.socketNumber,
            socketLabel: socketDto.socketLabel,
            connectorType: socketDto.connectorType,
            maxPowerKw: socketDto.maxPowerKw,
            pricePerKwh: socketDto.pricePerKwh,
            pricePerHour: socketDto.pricePerHour,
            isFree: socketDto.isFree || false,
            bookingMode: socketDto.bookingMode || BookingMode.HYBRID,
            status: 'available',
          }),
        );

        await queryRunner.manager.save(sockets);

        chargersWithSockets.push({
          charger: savedCharger,
          sockets,
        });
      }

      await queryRunner.commitTransaction();
      console.log('✅ Station registration completed successfully');

      // Return station with chargers for compatibility
      return {
        ...savedStation,
        chargers: chargersWithSockets.map(c => ({ ...c.charger, sockets: c.sockets })),
        message: 'Charging station registered successfully. Awaiting admin approval.',
        needsApproval: true,
      };
    } catch (error) {
      console.error('❌ Station registration error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.detail) console.error('Error detail:', error.detail);
      if (error.constraint) console.error('Error constraint:', error.constraint);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException({
        message: 'Failed to register station',
        error: error.message,
        details: error.stack,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Parse Google Maps location URL to extract coordinates
   */
  private parseLocationUrl(locationUrl: string): {
    lat: number;
    lng: number;
    address: string;
  } {
    try {
      console.log('Parsing location URL:', locationUrl);
      
      if (!locationUrl || typeof locationUrl !== 'string') {
        throw new BadRequestException('Location URL is required and must be a string');
      }

      const trimmed = locationUrl.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('Location URL cannot be empty');
      }
      
      // Try multiple Google Maps URL formats:
      // Format 1: https://maps.google.com/?q=6.9271,79.8612
      // Format 2: https://www.google.com/maps/place/.../@6.9271,79.8612,17z
      // Format 3: https://www.google.com/maps/.../@6.9271,79.8612...
      // Format 4: https://goo.gl/maps/... (short link)
      // Format 5: Just coordinates: 6.9271,79.8612
      
      let coordMatch: RegExpMatchArray | null = null;
      
      // Try to match coordinates with @ symbol (e.g., /@6.9271,79.8612,17z or /@6.9271,79.8612/)
      coordMatch = trimmed.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
      
      // Try to match coordinates with ?q= (e.g., ?q=6.9271,79.8612)
      if (!coordMatch) {
        coordMatch = trimmed.match(/[\?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
      }
      
      // Try to match coordinates with ?ll= (e.g., ?ll=6.9271,79.8612)
      if (!coordMatch) {
        coordMatch = trimmed.match(/[\?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
      }
      
      // Try to match just coordinates (e.g., 6.9271,79.8612)
      if (!coordMatch) {
        coordMatch = trimmed.match(/^(-?\d+\.?\d+),\s*(-?\d+\.?\d+)$/);
      }
      
      // Try to match coordinates anywhere in the string (fallback)
      if (!coordMatch) {
        coordMatch = trimmed.match(/(-?\d+\.?\d+),\s*(-?\d+\.?\d+)/);
      }
      
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        
        console.log('Extracted coordinates:', { lat, lng });
        
        // Validate coordinates are reasonable
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return {
            lat,
            lng,
            address: trimmed,
          };
        } else {
          throw new BadRequestException(
            `Invalid coordinates: lat=${lat}, lng=${lng}. Latitude must be between -90 and 90, longitude between -180 and 180.`,
          );
        }
      }

      // If no coordinates found, throw error with hint
      console.error('Could not extract coordinates from:', trimmed);
      throw new BadRequestException(
        'Could not extract coordinates from location URL. Please provide a Google Maps link or coordinates in format: latitude,longitude',
      );
    } catch (error) {
      console.error('Error parsing location URL:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Invalid location URL format. Please use a Google Maps share link or coordinates.',
      );
    }
  }

  /**
   * Determine speed type based on charger type and power
   */
  private determineSpeedType(
    chargerType: 'ac' | 'dc',
    powerKw: number,
  ): 'ac_slow' | 'ac_fast' | 'dc_fast' | 'dc_rapid' | 'ultra_rapid' {
    if (chargerType === 'ac') {
      return powerKw <= 7 ? 'ac_slow' : 'ac_fast';
    } else {
      if (powerKw <= 60) return 'dc_fast';
      if (powerKw <= 150) return 'dc_rapid';
      return 'ultra_rapid';
    }
  }
}
