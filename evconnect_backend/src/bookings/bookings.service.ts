import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Charger } from '../charger/entities/charger.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: string): Promise<BookingEntity> {
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

    // Check for overlapping bookings
    const overlappingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.chargerId = :chargerId', { chargerId })
      .andWhere('booking.status NOT IN (:...statuses)', { statuses: ['cancelled', 'completed'] })
      .andWhere(
        '(booking.startTime < :endTime AND booking.endTime > :startTime)',
        { startTime: start, endTime: end }
      )
      .getOne();

    if (overlappingBooking) {
      throw new BadRequestException('Charger is already booked for this time slot');
    }

    // If price was not provided by client, calculate it from charger specs
    let finalPrice = 0;

    // Try to fetch charger to compute estimated price
    const charger = await this.chargerRepository.findOne({ where: { id: chargerId } });
    if (!charger) {
      throw new NotFoundException(`Charger with ID ${chargerId} not found`);
    }

    // Duration in hours
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

    const booking = this.bookingRepository.create({
      userId,
      chargerId,
      startTime: start,
      endTime: end,
      price: finalPrice,
      status: 'pending',
    });

    return this.bookingRepository.save(booking);
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
}
