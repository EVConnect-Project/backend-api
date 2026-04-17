import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateChargerDto } from '../charger/dto/create-charger.dto';
import { UpdateChargerDto } from '../charger/dto/update-charger.dto';
import { CreateIndividualChargerDto } from './dto/create-individual-charger.dto';
import { CreateStationDto } from './dto/create-station.dto';
import { CreateServiceStationDto } from './dto/create-service-station.dto';
import { ChargerSocket } from './entities/charger-socket.entity';
import { ChargingStation } from './entities/charging-station.entity';
import { ServiceStationApplicationEntity } from '../service-stations/entities/service-station-application.entity';
import { ServiceStationEntity } from '../service-stations/entities/service-station.entity';
import { BookingMode } from '../charger/enums/booking-mode.enum';
import { ChargerStatus } from '../charger/enums/charger-status.enum';
import { Station } from '../station/entities/station.entity';
import { ChargersGateway } from '../charger/chargers.gateway';

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
    @InjectRepository(ServiceStationApplicationEntity)
    private serviceStationApplicationRepository: Repository<ServiceStationApplicationEntity>,
    @InjectRepository(ServiceStationEntity)
    private serviceStationRepository: Repository<ServiceStationEntity>,
    private dataSource: DataSource,
    private httpService: HttpService,
    private chargersGateway: ChargersGateway,
  ) {}

  /**
   * Register a new charger and upgrade user to 'owner' role if needed
   * Note: If user is already a mechanic, they keep mechanic role but can still own chargers
   */
  /**
   * Get all chargers owned by a user
   * Returns BOTH verified and unverified chargers so owner can see pending approvals
   */
  async getMyChargers(ownerId: string) {
    try {
      console.log(`[OwnerService] Fetching chargers for owner: ${ownerId}`);

      // 1. Fetch chargers without eager loading station (table might not exist)
      const chargers = await this.chargerRepository.find({
        where: { ownerId },
        relations: ['sockets'],
        order: { 
          verified: 'DESC',  // Verified chargers first
          createdAt: 'DESC'  // Then newest first
        },
      });

      console.log(`[OwnerService] Found ${chargers.length} chargers for owner ${ownerId}.`);

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
          city: charger.city,
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
        '[OwnerService] Successfully processed chargers with stats. Verified count:',
        chargersWithStats.filter(c => c.verified).length,
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

  async registerServiceStation(dto: CreateServiceStationDto, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'user') {
      user.role = 'owner';
      await this.userRepository.save(user);
    }

    const { lat, lng, address } = await this.parseLocationUrl(dto.locationUrl);

    const application = this.serviceStationApplicationRepository.create({
      userId,
      stationName: dto.stationName,
      locationUrl: dto.locationUrl,
      lat,
      lng,
      address,
      city: dto.city?.trim(),
      phoneNumber: dto.phoneNumber?.trim() || null,
      description: dto.description,
      serviceCategories: dto.serviceCategories ?? [],
      amenities: dto.amenities ?? [],
      openingHours: dto.openingHours ?? { is24Hours: true, schedule: {} },
      images: dto.images ?? [],
      applicationStatus: 'pending',
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    });

    const saved = await this.serviceStationApplicationRepository.save(application);
    return {
      ...saved,
      message: 'Service station application submitted. Awaiting admin approval.',
      needsApproval: true,
    };
  }

  async getMyServiceStations(userId: string) {
    const applications = await this.serviceStationApplicationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const approvedStationRows = await this.serviceStationRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
    const approvedByApplicationId = new Map(
      approvedStationRows
        .filter((s) => s.applicationId)
        .map((s) => [s.applicationId as string, s]),
    );

    return applications.map((application) => ({
      id: application.id,
      stationName: application.stationName,
      locationUrl: application.locationUrl,
      lat: application.lat,
      lng: application.lng,
      city: application.city,
      address: application.address,
      phoneNumber: application.phoneNumber,
      verified: application.applicationStatus === 'approved',
      status: application.applicationStatus,
      reviewNotes: application.reviewNotes,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt,
      description: application.description,
      serviceCategories: application.serviceCategories ?? [],
      amenities: application.amenities ?? [],
      openingHours: application.openingHours,
      isOpen: this.computeCurrentOpenState(application.openingHours),
      images: application.images ?? [],
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      approvedStationId: approvedByApplicationId.get(application.id)?.id ?? null,
    }));
  }

  async updateMyServiceStation(
    applicationId: string,
    userId: string,
    payload: {
      stationName?: string;
      locationUrl?: string;
      city?: string;
      phoneNumber?: string;
      description?: string;
      serviceCategories?: string[];
      amenities?: string[];
      images?: string[];
      openingHours?: {
        is24Hours?: boolean;
        schedule?: {
          [key: string]: { open: string; close: string; closed?: boolean };
        };
      };
    },
  ) {
    const application = await this.serviceStationApplicationRepository.findOne({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Service station application not found');
    }

    if (payload.stationName != null) {
      application.stationName = payload.stationName.trim();
    }
    if (payload.locationUrl != null && payload.locationUrl.trim().length > 0) {
      const { lat, lng, address } = await this.parseLocationUrl(payload.locationUrl);
      application.locationUrl = payload.locationUrl.trim();
      application.lat = lat;
      application.lng = lng;
      application.address = address;
    }
    if (payload.city != null) {
      application.city = payload.city.trim();
    }
    if (payload.phoneNumber != null) {
      application.phoneNumber = payload.phoneNumber.trim() || null;
    }
    if (payload.description != null) {
      application.description = payload.description.trim() || null;
    }
    if (payload.serviceCategories != null) {
      application.serviceCategories = payload.serviceCategories;
    }
    if (payload.amenities != null) {
      application.amenities = payload.amenities;
    }
    if (payload.images != null) {
      application.images = payload.images;
    }
    if (payload.openingHours != null) {
      application.openingHours = {
        ...(application.openingHours ?? { is24Hours: true, schedule: {} }),
        ...payload.openingHours,
      };
      delete (application.openingHours as any).manualOverrideOpen;
      delete (application.openingHours as any).manualOverrideUpdatedAt;
    }

    const saved = await this.serviceStationApplicationRepository.save(application);

    const approvedStation = await this.serviceStationRepository.findOne({
      where: { applicationId: saved.id, ownerId: userId },
    });

    if (approvedStation) {
      approvedStation.stationName = saved.stationName;
      approvedStation.locationUrl = saved.locationUrl;
      approvedStation.lat = saved.lat;
      approvedStation.lng = saved.lng;
      approvedStation.address = saved.address;
      approvedStation.city = saved.city;
      approvedStation.phoneNumber = saved.phoneNumber;
      approvedStation.description = saved.description;
      approvedStation.serviceCategories = saved.serviceCategories ?? [];
      approvedStation.amenities = saved.amenities ?? [];
      approvedStation.images = saved.images ?? [];
      approvedStation.openingHours = saved.openingHours;
      await this.serviceStationRepository.save(approvedStation);
    }

    return {
      id: saved.id,
      stationName: saved.stationName,
      locationUrl: saved.locationUrl,
      lat: saved.lat,
      lng: saved.lng,
      city: saved.city,
      phoneNumber: saved.phoneNumber,
      description: saved.description,
      serviceCategories: saved.serviceCategories ?? [],
      amenities: saved.amenities ?? [],
      images: saved.images ?? [],
      openingHours: saved.openingHours,
      isOpen: this.computeCurrentOpenState(saved.openingHours),
      updatedAt: saved.updatedAt,
    };
  }

  async updateMyServiceStationOpenStatus(
    applicationId: string,
    userId: string,
    isOpen: boolean,
  ) {
    const application = await this.serviceStationApplicationRepository.findOne({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Service station application not found');
    }

    const current = application.openingHours ?? { is24Hours: true, schedule: {} };
    application.openingHours = {
      ...current,
      manualOverrideOpen: isOpen,
      manualOverrideUpdatedAt: new Date().toISOString(),
    } as any;

    const saved = await this.serviceStationApplicationRepository.save(application);
    return {
      id: saved.id,
      isOpen,
      openingHours: saved.openingHours,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteMyServiceStation(applicationId: string, userId: string) {
    const application = await this.serviceStationApplicationRepository.findOne({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Service station application not found');
    }

    const approvedStation = await this.serviceStationRepository.findOne({
      where: { applicationId: application.id, ownerId: userId },
    });

    if (approvedStation) {
      await this.serviceStationRepository.remove(approvedStation);
    }

    await this.serviceStationApplicationRepository.remove(application);

    return {
      message: 'Service station deleted successfully',
      deletedApplicationId: applicationId,
      deletedStationId: approvedStation?.id ?? null,
    };
  }

  private computeCurrentOpenState(openingHours?: {
    is24Hours?: boolean;
    schedule?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  }): boolean {
    if (!openingHours) return true;

    if (openingHours.is24Hours) {
      return true;
    }

    const schedule = openingHours.schedule ?? {};
    const now = new Date();
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayKey = dayNames[now.getDay()];
    const today = schedule[dayKey];
    if (!today) return false;
    if (today.closed == true) return false;

    const toMinutes = (value?: string) => {
      if (!value) return -1;
      const parts = value.split(':');
      if (parts.length != 2) return -1;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return -1;
      return hour * 60 + minute;
    };

    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (open < 0 || close < 0) return false;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (close >= open) {
      return nowMinutes >= open && nowMinutes <= close;
    }

    // Overnight window (e.g. 22:00 - 06:00)
    return nowMinutes >= open || nowMinutes <= close;
  }

  private mapAmenitiesToFlags(amenities?: string[]): Record<string, boolean> | null {
    if (!amenities || amenities.length === 0) return null;

    const flags: Record<string, boolean> = {};
    for (const amenity of amenities) {
      const key = amenity?.trim();
      if (!key) continue;
      flags[key] = true;
    }

    return Object.keys(flags).length > 0 ? flags : null;
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

    let imageFallback: string[] = [];
    if (charger.stationId) {
      const parentStation = await this.stationRepository.findOne({ where: { id: charger.stationId } });
      if (parentStation && parentStation.images) {
        imageFallback = parentStation.images;
      }
    }

    const chargerImages = charger.images && charger.images.length > 0
      ? charger.images
      : imageFallback;

    return {
      ...charger,
      images: chargerImages,
      powerKw: charger.maxPowerKw, // Explicitly include powerKw for frontend compatibility
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

    Object.assign(charger, updateChargerDto);
    
    // Handle virtual powerKw field mapping to maxPowerKw
    // Object.assign doesn't properly invoke setters for virtual properties
    if ('powerKw' in updateChargerDto && updateChargerDto.powerKw !== undefined) {
      charger.maxPowerKw = updateChargerDto.powerKw;
    }
    
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

    // Broadcast real-time update so the map removes/updates the pin immediately
    try {
      const broadcastAction = status === 'offline' ? 'deleted' : 'updated';
      this.chargersGateway.broadcastChargerUpdate(updated, broadcastAction);
    } catch (e) {
      console.error('[OwnerService] Failed to broadcast charger status change:', e);
    }

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
   * Update a pending booking request status (owner approval flow)
   */
  async updateBookingStatusForOwner(
    id: string,
    status: 'confirmed' | 'cancelled',
    ownerId: string,
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['charger'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.charger.ownerId !== ownerId) {
      throw new ForbiddenException('You can only manage bookings for your own chargers');
    }

    if (booking.status !== 'pending') {
      throw new BadRequestException(
        `Only pending bookings can be updated. Current status: ${booking.status}`,
      );
    }

    booking.status = status;
    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
    }
    const updated = await this.bookingRepository.save(booking);

    return {
      booking: updated,
      message:
        status == 'confirmed'
            ? 'Booking request confirmed successfully'
            : 'Booking request declined successfully',
    };
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
    try {
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

      // Helper function to build base query
      const buildBaseQuery = () => {
        let query = this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.chargerId IN (:...chargerIds)', { chargerIds });

        if (startDate && endDate) {
          query = query.andWhere('booking.createdAt BETWEEN :startDate AND :endDate', {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          });
        }
        return query;
      };

      // Get total revenue (all bookings)
      const totalRevenue = await buildBaseQuery()
        .select('SUM(booking.price)', 'total')
        .getRawOne();

      // Get completed revenue
      const completedRevenue = await buildBaseQuery()
        .andWhere('booking.status = :status', { status: 'completed' })
        .select('SUM(booking.price)', 'total')
        .getRawOne();

      // Get pending revenue
      const pendingRevenue = await buildBaseQuery()
        .andWhere('booking.status = :status', { status: 'pending' })
        .select('SUM(booking.price)', 'total')
        .getRawOne();

      return {
        totalRevenue: parseFloat(totalRevenue?.total || '0'),
        completedBookingsRevenue: parseFloat(completedRevenue?.total || '0'),
        pendingRevenue: parseFloat(pendingRevenue?.total || '0'),
      };
    } catch (error) {
      console.error('[OwnerService] Error in getRevenueStats:', error.message, error.stack);
      throw error;
    }
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
      const { lat, lng, address } = await this.parseLocationUrl(dto.locationUrl);
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
        city: dto.city?.trim(),
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
        images: dto.images || [],
        amenities: this.mapAmenitiesToFlags(dto.amenities),
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
    const { lat, lng, address } = await this.parseLocationUrl(dto.locationUrl);
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
        city: dto.city?.trim(),
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
          city: dto.city?.trim(),
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
   * Supports:
   * - Full Google Maps URLs (https://maps.google.com/?q=lat,lng)
   * - Google Maps place URLs (https://www.google.com/maps/place/.../@lat,lng)
   * - Shortened Google Maps URLs (https://maps.app.goo.gl/...)
   * - Direct coordinates (lat,lng)
   */
  private async parseLocationUrl(locationUrl: string): Promise<{
    lat: number;
    lng: number;
    address: string;
  }> {
    try {
      console.log('Parsing location URL:', locationUrl);
      
      if (!locationUrl || typeof locationUrl !== 'string') {
        throw new BadRequestException('Location URL is required and must be a string');
      }

      const trimmed = locationUrl.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('Location URL cannot be empty');
      }
      
      let urlToCheck = trimmed;
      
      // Check if this is a shortened URL (goo.gl or maps.app.goo.gl)
      if (trimmed.match(/^https?:\/\/(maps\.app\.)?goo\.gl\//i)) {
        console.log('📍 Detected shortened Google Maps URL, expanding...');
        try {
          urlToCheck = await this.expandShortenedUrl(trimmed);
          console.log('✅ Expanded URL:', urlToCheck);
        } catch (expandError) {
          console.warn('⚠️  Could not expand shortened URL:', expandError.message);
          // Fall through to try to extract from original URL
          urlToCheck = trimmed;
        }
      }
      
      const extractCoordinates = (
        input: string,
      ): { lat: number; lng: number; source: string } | null => {
        const parsePair = (latRaw: string, lngRaw: string): { lat: number; lng: number } | null => {
          const lat = parseFloat(latRaw);
          const lng = parseFloat(lngRaw);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
          }
          return { lat, lng };
        };

        const parseFromText = (text: string): { lat: number; lng: number } | null => {
          const match = text.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
          if (!match) return null;
          return parsePair(match[1], match[2]);
        };

        // 1) Plain coordinates: "lat,lng"
        const plain = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (plain) {
          const parsed = parsePair(plain[1], plain[2]);
          if (parsed) return { ...parsed, source: 'plain_coordinates' };
        }

        // 2) Query params usually represent explicit destination/search coordinates.
        try {
          const uri = new URL(input);
          const candidateKeys = ['destination', 'daddr', 'q', 'll', 'query'];
          for (const key of candidateKeys) {
            const value = uri.searchParams.get(key);
            if (!value) continue;
            const parsed = parseFromText(value);
            if (parsed) return { ...parsed, source: `query_param:${key}` };
          }
        } catch {
          // Not a full URL; ignore and continue with explicit patterns only.
        }

        // 3) Google Maps !3dLAT!4dLNG pattern (usually place pin location).
        const bangMatch = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
        if (bangMatch) {
          const parsed = parsePair(bangMatch[1], bangMatch[2]);
          if (parsed) return { ...parsed, source: 'bang_3d_4d' };
        }

        // 4) Encoded query fragments in raw text.
        const queryLike = input.match(
          /[?&](?:destination|daddr|q|ll|query)=([^&]+)/i,
        );
        if (queryLike?.[1]) {
          const decoded = decodeURIComponent(queryLike[1]);
          const parsed = parseFromText(decoded);
          if (parsed) return { ...parsed, source: 'raw_query_fragment' };
        }

        // 5) /@lat,lng pattern is usually viewport center and may be less accurate.
        const atMatch = input.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (atMatch) {
          const parsed = parsePair(atMatch[1], atMatch[2]);
          if (parsed) return { ...parsed, source: 'viewport_at' };
        }

        // 6) Path coordinates such as /place/6.9271,79.8612 or /search/6.9271,79.8612
        const pathMatch = input.match(
          /\/(?:place|search)\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
        );
        if (pathMatch) {
          const parsed = parsePair(pathMatch[1], pathMatch[2]);
          if (parsed) return { ...parsed, source: 'path_place_search' };
        }

        return null;
      };

      const coordinates = extractCoordinates(urlToCheck);

      if (coordinates) {
        console.log('✅ Extracted coordinates:', {
          lat: coordinates.lat,
          lng: coordinates.lng,
          source: coordinates.source,
        });
        return {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: trimmed,
        };
      }

      // If no coordinates found, throw error with hint
      console.error('❌ Could not extract coordinates from:', urlToCheck);
      throw new BadRequestException(
        'Could not extract coordinates from location URL. Please provide a Google Maps link or coordinates in format: latitude,longitude',
      );
    } catch (error) {
      console.error('Error parsing location URL:', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Invalid location URL format. Please use a Google Maps share link or coordinates.',
      );
    }
  }

  /**
   * Expand shortened Google Maps URLs (goo.gl, maps.app.goo.gl)
   * Follow redirects to get the full URL with coordinates
   */
  private async expandShortenedUrl(shortenedUrl: string): Promise<string> {
    try {
      console.log('🔗 Fetching expanded URL from:', shortenedUrl);
      
      // Make a request with maxRedirects: 0 to capture the first redirect Location header
      const response = await lastValueFrom(
        this.httpService.get(shortenedUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        })
      ).catch((err) => {
        // Axios throws on 3xx when maxRedirects: 0, so catch and inspect headers
        if (err.response && err.response.status >= 300 && err.response.status < 400) {
          return err.response;
        }
        throw err;
      });

      // Check Location header for redirect target  
      const location = response.headers?.location;
      if (location) {
        console.log('✅ Location header found:', location);
        return location;
      }

      // If no redirect, try the final URL
      const finalUrl = response.request?.res?.responseUrl || response.config?.url;
      if (finalUrl && finalUrl !== shortenedUrl) {
        console.log('✅ Final URL found:', finalUrl);
        return finalUrl;
      }

      console.warn('⚠️  Could not determine redirect URL, using original');
      return shortenedUrl;
    } catch (error) {
      console.warn('⚠️  Error expanding shortened URL:', error.message);
      return shortenedUrl;
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
