import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Charger } from '../charger/entities/charger.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingMode } from '../charger/enums/booking-mode.enum';
import { BookingType } from '../charger/enums/booking-type.enum';
import { ChargerStatus } from '../charger/enums/charger-status.enum';
import { CreateWalkInBookingDto, CreatePreBookingDto, CheckInBookingDto } from './dto/booking-type.dto';

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
    private notificationsService: NotificationsService,
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

    // Check if charger is verified by admin
    if (!charger.verified) {
      throw new BadRequestException('This charger is not yet verified by admin and cannot accept bookings');
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

    // Send booking confirmation notification
    await this.notificationsService.sendBookingConfirmed(
      userId,
      savedBooking.id,
      charger.name || 'charging station',
      start,
    );

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
   * Send booking reminder notifications 15 minutes before start time
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleBookingReminders() {
    try {
      // Find bookings starting in 13-17 minutes (15 min ± 2 min buffer for 5-min cron)
      const now = new Date();
      const reminderStart = new Date(now.getTime() + 13 * 60 * 1000);
      const reminderEnd = new Date(now.getTime() + 17 * 60 * 1000);

      const upcomingBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.charger', 'charger')
        .where('booking.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
        .andWhere('booking.startTime >= :reminderStart', { reminderStart })
        .andWhere('booking.startTime <= :reminderEnd', { reminderEnd })
        .getMany();

      for (const booking of upcomingBookings) {
        const charger = booking.charger;
        const minutesUntil = Math.round((booking.startTime.getTime() - now.getTime()) / 60000);

        // Send reminder notification
        await this.notificationsService.sendBookingReminder(
          booking.userId,
          booking.id,
          charger.name || 'your charging station',
          minutesUntil,
        );

        this.logger.log(
          `Sent booking reminder for booking ${booking.id} (${minutesUntil} minutes until start)`
        );
      }

      if (upcomingBookings.length > 0) {
        this.logger.log(`Processed ${upcomingBookings.length} booking reminders`);
      }
    } catch (error) {
      this.logger.error('Error processing booking reminders', error);
    }
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

        // Send auto-cancel notification
        await this.notificationsService.sendBookingAutoCancelled(
          booking.userId,
          booking.id,
          charger.name || 'charging station',
        );
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

  /**
   * Get upcoming bookings for a charger to show occupied time slots
   * @param chargerId Charger ID
   * @returns List of active and upcoming bookings
   */
  async getUpcomingBookingsForCharger(chargerId: string): Promise<any[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId = :chargerId', { chargerId })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: ['confirmed', 'active', 'pending'] 
      })
      .andWhere('booking.endTime > :now', { now })
      .andWhere('booking.startTime < :sevenDaysFromNow', { sevenDaysFromNow })
      .orderBy('booking.startTime', 'ASC')
      .getMany();

    // Return sanitized booking data (no personal info)
    return bookings.map(booking => ({
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      bookingType: booking.bookingType,
      isActive: booking.status === 'active',
    }));
  }

  /**
   * Create a walk-in booking (instant charging without pre-booking)
   * @param dto Walk-in booking data
   * @param userId User creating the booking
   * @returns Created booking
   */
  async createWalkInBooking(
    dto: CreateWalkInBookingDto, 
    userId: string
  ): Promise<BookingResponse> {
    const charger = await this.chargerRepository.findOne({ 
      where: { id: dto.chargerId },
      relations: ['owner']
    });
    
    if (!charger) {
      throw new NotFoundException(`Charger with ID ${dto.chargerId} not found`);
    }

    // Check if charger is verified by admin
    if (!charger.verified) {
      throw new BadRequestException('This charger is not yet verified by admin and cannot accept bookings');
    }

    // Validate booking mode allows walk-ins
    if (!this.validateBookingType(charger, BookingType.WALK_IN)) {
      throw new BadRequestException(
        'This charger only accepts pre-bookings. Please make a reservation in advance.'
      );
    }

    // Check charger status
    if (charger.currentStatus !== ChargerStatus.AVAILABLE) {
      throw new BadRequestException(
        `Charger is currently ${charger.currentStatus}. Please try again later.`
      );
    }

    // Check for active pre-bookings (they have priority)
    const now = new Date();
    const endTime = new Date(dto.endTime);

    const activePreBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId = :chargerId', { chargerId: dto.chargerId })
      .andWhere('booking.bookingType = :bookingType', { bookingType: BookingType.PRE_BOOKING })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('booking.startTime <= :endTime', { endTime })
      .andWhere('booking.endTime > :now', { now })
      .getOne();

    if (activePreBooking) {
      throw new BadRequestException(
        'This charger has a pre-booking that conflicts with your requested time. ' +
        'Pre-bookings have priority. Please select a different charger or time.'
      );
    }

    // Calculate price
    const durationMs = endTime.getTime() - now.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const price = Number((charger.powerKw * charger.pricePerKwh * durationHours).toFixed(2));

    // Create walk-in booking
    const booking = this.bookingRepository.create({
      userId,
      chargerId: dto.chargerId,
      startTime: now,
      endTime,
      price,
      status: 'active', // Walk-ins start immediately
      bookingType: BookingType.WALK_IN,
      checkInTime: now,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Update charger status to occupied
    charger.currentStatus = ChargerStatus.OCCUPIED;
    charger.lastStatusUpdate = now;
    await this.chargerRepository.save(charger);

    this.logger.log(`Walk-in booking created: ${savedBooking.id} for charger ${dto.chargerId}`);

    // Send notification
    await this.notificationsService.sendBookingConfirmed(
      userId,
      savedBooking.id,
      charger.name || 'charging station',
      now,
    );

    return {
      booking: savedBooking,
      warnings: [],
      accessType: charger.accessType,
      requiresPhysicalVerification: false,
      gracePeriodMinutes: 0,
      autoCancelAfterMinutes: 0,
    };
  }

  /**
   * Create a pre-booking (reservation for future charging)
   * @param dto Pre-booking data
   * @param userId User creating the booking
   * @returns Created booking with grace period info
   */
  async createPreBooking(
    dto: CreatePreBookingDto, 
    userId: string
  ): Promise<BookingResponse> {
    const charger = await this.chargerRepository.findOne({ 
      where: { id: dto.chargerId },
      relations: ['owner']
    });
    
    if (!charger) {
      throw new NotFoundException(`Charger with ID ${dto.chargerId} not found`);
    }

    // Check if charger is verified by admin
    if (!charger.verified) {
      throw new BadRequestException('This charger is not yet verified by admin and cannot accept bookings');
    }

    // Validate booking mode allows pre-bookings
    if (!this.validateBookingType(charger, BookingType.PRE_BOOKING)) {
      throw new BadRequestException(
        'This charger does not accept pre-bookings. Please use walk-in mode when you arrive.'
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    // Validate times
    if (startTime < now) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate booking duration
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    const settings = charger.bookingSettings;

    if (durationMinutes < settings.minBookingMinutes) {
      throw new BadRequestException(
        `Minimum booking duration is ${settings.minBookingMinutes} minutes`
      );
    }

    if (durationMinutes > settings.maxBookingMinutes) {
      throw new BadRequestException(
        `Maximum booking duration is ${settings.maxBookingMinutes} minutes`
      );
    }

    // Validate advance booking window
    const daysInAdvance = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysInAdvance > settings.advanceBookingDays) {
      throw new BadRequestException(
        `You can only book up to ${settings.advanceBookingDays} days in advance`
      );
    }

    // Check for overlapping bookings
    const overlapping = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId = :chargerId', { chargerId: dto.chargerId })
      .andWhere('booking.status NOT IN (:...statuses)', { statuses: ['cancelled', 'completed', 'no_show'] })
      .andWhere('booking.startTime < :endTime', { endTime })
      .andWhere('booking.endTime > :startTime', { startTime })
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        'This time slot is already booked. Please select a different time.'
      );
    }

    // Calculate price
    const durationHours = durationMinutes / 60;
    const price = Number((charger.powerKw * charger.pricePerKwh * durationHours).toFixed(2));

    // Calculate grace period expiration
    const gracePeriodExpiresAt = new Date(
      startTime.getTime() + settings.gracePeriodMinutes * 60000
    );

    // Create pre-booking
    const booking = this.bookingRepository.create({
      userId,
      chargerId: dto.chargerId,
      startTime,
      endTime,
      price,
      status: 'confirmed',
      bookingType: BookingType.PRE_BOOKING,
      gracePeriodExpiresAt,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Update charger status to reserved
    charger.currentStatus = ChargerStatus.RESERVED;
    charger.lastStatusUpdate = now;
    await this.chargerRepository.save(charger);

    this.logger.log(`Pre-booking created: ${savedBooking.id} for charger ${dto.chargerId}`);

    // Send notification
    await this.notificationsService.sendBookingConfirmed(
      userId,
      savedBooking.id,
      charger.name || 'charging station',
      startTime,
    );

    const warnings: BookingWarning[] = [{
      type: 'requires_verification',
      severity: 'high',
      message: `You must check in within ${settings.gracePeriodMinutes} minutes of your start time`,
      recommendedAction: 'Arrive on time and tap "Check In" in the app when you reach the charger'
    }];

    return {
      booking: savedBooking,
      warnings,
      accessType: charger.accessType,
      requiresPhysicalVerification: true,
      gracePeriodMinutes: settings.gracePeriodMinutes,
      autoCancelAfterMinutes: settings.gracePeriodMinutes,
    };
  }

  /**
   * Check in to a pre-booking (mark arrival and activate charging)
   * @param dto Check-in data
   * @param userId User checking in
   * @returns Updated booking
   */
  async checkInBooking(
    dto: CheckInBookingDto, 
    userId: string
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['charger']
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only check in to your own bookings');
    }

    if (booking.bookingType !== BookingType.PRE_BOOKING) {
      throw new BadRequestException('Only pre-bookings require check-in');
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Booking must be confirmed to check in');
    }

    const now = new Date();

    // Check if within grace period
    if (booking.gracePeriodExpiresAt && now > booking.gracePeriodExpiresAt) {
      booking.status = 'no_show';
      booking.noShow = true;
      await this.bookingRepository.save(booking);

      throw new BadRequestException(
        'Check-in window has expired. Your booking has been marked as a no-show.'
      );
    }

    // Check if too early
    const earliestCheckIn = new Date(booking.startTime.getTime() - 10 * 60000); // 10 min before
    if (now < earliestCheckIn) {
      throw new BadRequestException(
        'You can only check in up to 10 minutes before your booking start time'
      );
    }

    // Update booking
    booking.checkInTime = now;
    booking.status = 'active';
    const updatedBooking = await this.bookingRepository.save(booking);

    // Update charger status
    const charger = booking.charger;
    charger.currentStatus = ChargerStatus.OCCUPIED;
    charger.lastStatusUpdate = now;
    await this.chargerRepository.save(charger);

    this.logger.log(`User ${userId} checked in to booking ${dto.bookingId}`);

    return updatedBooking;
  }

  /**
   * Handle no-show for pre-booking (called by cron job)
   * @param bookingId Booking ID
   */
  async handleNoShow(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['charger', 'user']
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found for no-show processing`);
      return;
    }

    booking.noShow = true;
    booking.status = 'no_show';
    await this.bookingRepository.save(booking);

    // Release charger
    const charger = booking.charger;
    charger.currentStatus = ChargerStatus.AVAILABLE;
    charger.lastStatusUpdate = new Date();
    await this.chargerRepository.save(charger);

    this.logger.log(`Booking ${bookingId} marked as no-show`);

    // Send notification
    await this.notificationsService.sendBookingAutoCancelled(
      booking.userId,
      bookingId,
      charger.name || 'charging station',
    );
  }

  /**
   * Validate if charger allows the specified booking type
   * @param charger Charger entity
   * @param bookingType Requested booking type
   * @returns True if allowed
   */
  private validateBookingType(charger: Charger, bookingType: BookingType): boolean {
    switch (charger.bookingMode) {
      case BookingMode.PRE_BOOKING_REQUIRED:
        return bookingType === BookingType.PRE_BOOKING;
      
      case BookingMode.WALK_IN_ONLY:
        return bookingType === BookingType.WALK_IN;
      
      case BookingMode.HYBRID:
        return true; // Both types allowed
      
      default:
        return false;
    }
  }

  /**
   * Cron job to handle expired grace periods for pre-bookings
   * Runs every 2 minutes
   */
  @Cron('*/2 * * * *')
  async handleExpiredGracePeriods() {
    const now = new Date();

    const expiredBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.bookingType = :bookingType', { bookingType: BookingType.PRE_BOOKING })
      .andWhere('booking.status = :status', { status: 'confirmed' })
      .andWhere('booking.gracePeriodExpiresAt < :now', { now })
      .andWhere('booking.checkInTime IS NULL')
      .getMany();

    this.logger.log(`Processing ${expiredBookings.length} expired grace periods`);

    for (const booking of expiredBookings) {
      await this.handleNoShow(booking.id);
    }
  }
}
