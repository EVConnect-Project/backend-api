import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Charger } from '../charger/entities/charger.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BookingWarning {
  type: 'public_charger' | 'semi_public_charger' | 'no_occupancy_sensor' | 'requires_verification';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendedAction?: string;
}

export interface BookingResponse {
  booking: BookingEntity;
  warnings: BookingWarning[];
  accessType: string;
  requiresPhysicalVerification: boolean;
  gracePeriodMinutes: number;
  autoCancelAfterMinutes: number;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  /**
   * Create a booking with comprehensive access type checking and conflict prevention
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<BookingResponse> {
    const { chargerId, startTime, endTime, price } = createBookingDto;

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('End time must be after start time');
    }

    if (start < new Date()) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    // Fetch charger with owner relationship
    const charger = await this.chargerRepository.findOne({ 
      where: { id: chargerId },
      relations: ['owner']
    });
    
    if (!charger) {
      throw new NotFoundException(`Charger with ID ${chargerId} not found`);
    }

    // Initialize warnings array
    const warnings: BookingWarning[] = [];

    // ACCESS TYPE CHECKING - Critical for conflict prevention
    const accessType = charger.accessType || 'private';

    // Handle PUBLIC chargers - Warning only, no guaranteed booking
    if (accessType === 'public') {
      warnings.push({
        type: 'public_charger',
        severity: 'high',
        message: '⚠️ This is a PUBLIC charger accessible without the app. Your booking is NOT guaranteed.',
        recommendedAction: 'Arrive on time. Consider booking a PRIVATE charger for guaranteed availability.'
      });

      // PUBLIC chargers cannot have guaranteed bookings
      if (!charger.requiresAuth) {
        warnings.push({
          type: 'no_occupancy_sensor',
          severity: 'medium',
          message: 'This charger does not require authentication and may be occupied by non-app users.',
          recommendedAction: 'Have backup chargers ready. Check real-time availability before departure.'
        });
      }
    }

    // Handle SEMI-PUBLIC chargers - Verification required
    if (accessType === 'semi-public') {
      warnings.push({
        type: 'semi_public_charger',
        severity: 'medium',
        message: 'This is a SEMI-PUBLIC charger. Physical verification required upon arrival.',
        recommendedAction: 'You will need to confirm your presence at the charger via the app.'
      });

      if (charger.requiresPhysicalCheck) {
        warnings.push({
          type: 'requires_verification',
          severity: 'medium',
          message: 'You must verify your physical presence within 10 minutes of start time.',
          recommendedAction: 'Open the app when you arrive and tap "I\'m Here" to confirm.'
        });
      }
    }

    // Check for overlapping bookings (with grace period consideration)
    const gracePeriod = charger.bookingGracePeriod || 0;
    const effectiveStartTime = new Date(start.getTime() - gracePeriod * 60 * 1000);

    const overlappingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId = :chargerId', { chargerId })
      .andWhere('booking.status NOT IN (:...statuses)', { statuses: ['cancelled', 'completed', 'no_show'] })
      .andWhere(
        '(booking.startTime < :endTime AND booking.endTime > :effectiveStartTime)',
        { effectiveStartTime, endTime: end }
      )
      .getOne();

    if (overlappingBooking) {
      // For PRIVATE chargers, strictly prevent overlaps
      if (accessType === 'private') {
        throw new BadRequestException('Charger is already booked for this time slot');
      }
      
      // For PUBLIC/SEMI-PUBLIC, warn but allow booking
      warnings.push({
        type: 'public_charger',
        severity: 'high',
        message: 'Another booking exists for this time. Since this is a public/semi-public charger, both bookings will proceed.',
        recommendedAction: 'Consider selecting a different time slot or charger for guaranteed availability.'
      });
    }

    // Calculate price
    let finalPrice = 0;
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const chargerPower = Number(charger.powerKw || 0);
    const chargerPricePerKwh = Number(charger.pricePerKwh || 0);
    const calculatedPrice = chargerPower * chargerPricePerKwh * durationHours;

    if (price && price > 0) {
      finalPrice = price;
    } else {
      finalPrice = Number(calculatedPrice.toFixed(2));
    }

    // Create booking
    const booking = this.bookingRepository.create({
      userId,
      chargerId,
      startTime: start,
      endTime: end,
      price: finalPrice,
      status: 'pending',
    });

    const savedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Booking created: ${savedBooking.id} for charger ${chargerId} (${accessType}) by user ${userId}`);

    // Return comprehensive response
    return {
      booking: savedBooking,
      warnings,
      accessType,
      requiresPhysicalVerification: charger.requiresPhysicalCheck || false,
      gracePeriodMinutes: charger.bookingGracePeriod || 0,
      autoCancelAfterMinutes: charger.autoCancelAfter || 15,
    };
  }

  async findAll(): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      relations: ['user', 'charger'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'charger'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async findByUser(userId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { userId },
      relations: ['charger'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCharger(chargerId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { chargerId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(id: string, userId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id);

    // Check if user owns the booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Check if booking can be cancelled
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel a ${booking.status} booking`);
    }

    // Check if booking has already started
    if (new Date() >= booking.startTime && booking.status === 'active') {
      throw new BadRequestException('Cannot cancel an active booking');
    }

    booking.status = 'cancelled';
    return this.bookingRepository.save(booking);
  }

  async updateStatus(id: string, status: string): Promise<BookingEntity> {
    const booking = await this.findOne(id);
    booking.status = status;
    return this.bookingRepository.save(booking);
  }

  /**
   * Auto-cancel bookings that exceeded grace period without physical verification
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoCancelExpiredBookings() {
    const now = new Date();
    
    // Find all pending bookings that have passed their auto-cancel threshold
    const expiredBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.charger', 'charger')
      .where('booking.status = :status', { status: 'pending' })
      .andWhere('booking.startTime < :now', { now })
      .getMany();

    let cancelledCount = 0;

    for (const booking of expiredBookings) {
      const charger = booking.charger;
      if (!charger) continue;

      const autoCancelMinutes = charger.autoCancelAfter || 15;
      const autoCancelThreshold = new Date(booking.startTime.getTime() + autoCancelMinutes * 60 * 1000);

      if (now >= autoCancelThreshold) {
        // Auto-cancel the booking
        booking.status = 'no_show';
        await this.bookingRepository.save(booking);
        cancelledCount++;

        this.logger.warn(
          `Auto-cancelled booking ${booking.id} for charger ${charger.id} (${charger.accessType}) - ` +
          `User ${booking.userId} did not verify within ${autoCancelMinutes} minutes`
        );

        // TODO: Send push notification to user
        // TODO: Update charger availability status
        // TODO: Offer compensation (discount code) if it was a PRIVATE charger
      }
    }

    if (cancelledCount > 0) {
      this.logger.log(`Auto-cancel job completed: ${cancelledCount} bookings marked as no-show`);
    }
  }

  /**
   * Verify physical presence at charger location
   * Used for SEMI-PUBLIC chargers
   */
  async verifyPhysicalPresence(bookingId: string, userId: string, lat: number, lng: number): Promise<BookingEntity> {
    const booking = await this.findOne(bookingId);

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only verify your own bookings');
    }

    if (booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be verified');
    }

    const charger = await this.chargerRepository.findOne({ where: { id: booking.chargerId } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    // Calculate distance between user and charger (Haversine formula)
    const distance = this.calculateDistance(lat, lng, charger.lat, charger.lng);

    // User must be within 50 meters (0.05 km) of the charger
    if (distance > 0.05) {
      throw new BadRequestException(`You must be within 50 meters of the charger. Current distance: ${(distance * 1000).toFixed(0)}m`);
    }

    // Update charger's last physical check timestamp
    charger.lastPhysicalCheck = new Date();
    await this.chargerRepository.save(charger);

    // Activate the booking
    booking.status = 'active';
    const activatedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Physical verification successful for booking ${bookingId} at charger ${charger.id}`);

    return activatedBooking;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get alternative chargers when booking conflict detected
   */
  async getAlternativeChargers(
    originalChargerId: string, 
    startTime: Date, 
    endTime: Date, 
    radiusKm: number = 5
  ): Promise<Charger[]> {
    const originalCharger = await this.chargerRepository.findOne({ 
      where: { id: originalChargerId } 
    });

    if (!originalCharger) {
      return [];
    }

    // Find available chargers within radius
    const allChargers = await this.chargerRepository.find();

    const alternativeChargers: Charger[] = [];

    for (const charger of allChargers) {
      if (charger.id === originalChargerId) continue;

      const distance = this.calculateDistance(
        originalCharger.lat,
        originalCharger.lng,
        charger.lat,
        charger.lng
      );

      if (distance <= radiusKm) {
        // Check if this charger is available for the time slot
        const hasOverlap = await this.bookingRepository
          .createQueryBuilder('booking')
          .where('booking.chargerId = :chargerId', { chargerId: charger.id })
          .andWhere('booking.status NOT IN (:...statuses)', { statuses: ['cancelled', 'completed', 'no_show'] })
          .andWhere('(booking.startTime < :endTime AND booking.endTime > :startTime)', { startTime, endTime })
          .getOne();

        if (!hasOverlap || charger.accessType === 'public') {
          alternativeChargers.push(charger);
        }
      }
    }

    // Sort by distance (closest first) and reliability
    alternativeChargers.sort((a, b) => {
      const distA = this.calculateDistance(originalCharger.lat, originalCharger.lng, a.lat, a.lng);
      const distB = this.calculateDistance(originalCharger.lat, originalCharger.lng, b.lat, b.lng);
      
      // Prefer PRIVATE chargers
      if (a.accessType === 'private' && b.accessType !== 'private') return -1;
      if (a.accessType !== 'private' && b.accessType === 'private') return 1;
      
      return distA - distB;
    });

    return alternativeChargers.slice(0, 5); // Return top 5 alternatives
  }
}
