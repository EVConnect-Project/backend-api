import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateChargerDto } from '../charger/dto/create-charger.dto';
import { UpdateChargerDto } from '../charger/dto/update-charger.dto';

@Injectable()
export class OwnerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Register a new charger and upgrade user to 'owner' role if needed
   * Note: If user is already a mechanic, they keep mechanic role but can still own chargers
   */
  async registerCharger(createChargerDto: CreateChargerDto, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upgrade role to 'owner' only if user is a regular 'user' (not mechanic or admin)
    // Mechanics and admins can own chargers without changing their role
    if (user.role === 'user') {
      user.role = 'owner';
      await this.userRepository.save(user);
    }

    // Create charger with verified=false (requires admin approval)
    const charger = this.chargerRepository.create({
      ...createChargerDto,
      ownerId: userId,
      verified: false, // Requires admin approval
      status: 'offline', // Default to offline until verified
    });

    const savedCharger = await this.chargerRepository.save(charger);

    return {
      ...savedCharger,
      message: 'Charger registered successfully. Awaiting admin approval.',
      needsApproval: true,
    };
  }

  /**
   * Get all chargers owned by a user
   */
  async getMyChargers(ownerId: string) {
    const chargers = await this.chargerRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });

    // Get booking counts for each charger
    const chargersWithStats = await Promise.all(
      chargers.map(async (charger) => {
        const totalBookings = await this.bookingRepository.count({
          where: { chargerId: charger.id },
        });

        const activeBookings = await this.bookingRepository.count({
          where: { chargerId: charger.id, status: 'active' },
        });

        const pendingBookings = await this.bookingRepository.count({
          where: { chargerId: charger.id, status: 'pending' },
        });

        return {
          ...charger,
          stats: {
            totalBookings,
            activeBookings,
            pendingBookings,
          },
        };
      }),
    );

    return chargersWithStats;
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
}
