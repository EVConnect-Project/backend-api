import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ChargingService } from '../charging/charging.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MechanicApplication, ApplicationStatus } from '../mechanic/entities/mechanic-application.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { OwnerPaymentAccount } from '../owner/entities/owner-payment-account.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/types/notification-types';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    @InjectRepository(MechanicApplication)
    private mechanicApplicationRepository: Repository<MechanicApplication>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
    @InjectRepository(MarketplaceListing)
    private marketplaceRepository: Repository<MarketplaceListing>,
    @InjectRepository(OwnerPaymentAccount)
    private paymentAccountRepository: Repository<OwnerPaymentAccount>,
    private notificationsService: NotificationsService,
    private chargingService: ChargingService,
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    try {
      const totalUsers = await this.userRepository.count();
      const totalChargers = await this.chargerRepository.count();
      const totalBookings = await this.bookingRepository.count();
      
      const activeUsers = await this.userRepository.count({
        where: { isBanned: false },
      });
      
      const availableChargers = await this.chargerRepository.count({
        where: { currentStatus: 'available' as any },
      });
      
      console.log('About to query user growth...');
      // Calculate user growth for current month
      const recentUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('EXTRACT(YEAR FROM user.createdAt) = :year', {
          year: new Date().getFullYear(),
        })
        .andWhere('EXTRACT(MONTH FROM user.createdAt) = :month', {
          month: new Date().getMonth() + 1,
        })
        .getCount();
      console.log(`Recent users: ${recentUsers}`);
      
      return {
        totalUsers,
        totalChargers,
        totalBookings,
        totalRevenue: 0,
        activeUsers,
        availableChargers,
        revenueGrowth: 0,
        userGrowth: recentUsers,
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Analytics
  async getAnalytics(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.createdAt BETWEEN :start AND :end', { start, end })
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.charger', 'charger')
      .getMany();

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt BETWEEN :start AND :end', { start, end })
      .getMany();

    // User growth data
    const userGrowth = this.generateDailyData(users, start, end, 'users');

    // Revenue by location (simplified)
    const revenueByLocation = await this.getRevenueByLocation(bookings);

    // Charger utilization
    const chargerUtilization = await this.getChargerUtilization();

    // Booking trends
    const bookingTrends = this.generateDailyData(bookings, start, end, 'bookings');

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (Number(b.price) || 0),
      0,
    );
    const completedBookings = bookings.filter((b) => b.status === 'completed');

    return {
      userGrowth,
      revenueByLocation,
      chargerUtilization,
      bookingTrends,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueGrowth: 12.5,
        totalBookings: bookings.length,
        bookingGrowth: 8.3,
        avgSessionDuration: 2.5,
        peakHour: '6:00 PM',
      },
    };
  }

  async getRevenueData(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.createdAt BETWEEN :start AND :end', { start, end })
        .getMany();

      return this.generateDailyData(bookings, start, end, 'revenue');
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Return empty data for the date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      return this.generateDailyData([], start, end, 'revenue');
    }
  }

  async getUserGrowthData(period: string) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :startDate', { startDate })
      .getMany();

    return this.generateDailyData(users, startDate, new Date(), 'count');
  }

  async getBookingStats() {
    const [totalBookings, completedBookings, cancelledBookings, activeBookings] =
      await Promise.all([
        this.bookingRepository.count(),
        this.bookingRepository.count({ where: { status: 'completed' } }),
        this.bookingRepository.count({ where: { status: 'cancelled' } }),
        this.bookingRepository.count({ where: { status: 'active' } }),
      ]);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      activeBookings,
    };
  }

  // User Management
  async getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
  }) {
    const { page, limit, search, role } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.name ILIKE :search OR user.phoneNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      const roles = role.split(',');
      queryBuilder.andWhere('user.role IN (:...roles)', { roles });
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phoneNumber,
        role: u.role,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
        status: u.isBanned ? 'banned' : 'active',
      })),
      total,
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phoneNumber,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      status: user.isBanned ? 'banned' : 'active',
    };
  }

  async getUserPaymentAccounts(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const paymentAccounts = await this.paymentAccountRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return paymentAccounts.map(account => ({
      id: account.id,
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      branchCode: account.branchCode,
      verificationStatus: account.verificationStatus,
      verificationNotes: account.verificationNotes,
      isPrimary: account.isPrimary,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  }

  async banUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isBanned = true;
    await this.userRepository.save(user);
    return { message: 'User banned successfully' };
  }

  async unbanUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isBanned = false;
    await this.userRepository.save(user);
    return { message: 'User unbanned successfully' };
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    await this.userRepository.save(user);
    return { message: 'User role updated successfully' };
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      throw new BadRequestException('Cannot delete admin users');
    }

    // The cascade delete in the database schema will handle related records
    await this.userRepository.remove(user);
    
    return { message: 'User permanently deleted' };
  }

  // Charger Management
  async getChargers(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    verified?: boolean;
    banned?: boolean;
  }) {
    const { page, limit, search, status, verified, banned } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.chargerRepository
      .createQueryBuilder('charger')
      .leftJoinAndSelect('charger.owner', 'owner');

    if (search) {
      queryBuilder.where(
        '(charger.name ILIKE :search OR charger.address ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      const statuses = status.split(',');
      queryBuilder.andWhere('charger.status IN (:...statuses)', { statuses });
    }

    if (verified !== undefined) {
      queryBuilder.andWhere('charger.verified = :verified', { verified });
    }

    if (banned !== undefined) {
      queryBuilder.andWhere('charger.isBanned = :banned', { banned });
    }

    const [chargers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('charger.createdAt', 'DESC')
      .getManyAndCount();

    return {
      chargers: chargers.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        lat: Number(c.lat),
        lng: Number(c.lng),
        status: c.status,
        powerKw: Number(c.powerKw),
        pricePerKwh: Number(c.pricePerKwh),
        verified: c.verified,
        isBanned: c.isBanned,
        description: c.description,
        chargeBoxIdentity: c.chargeBoxIdentity || null,
        owner: c.owner
          ? {
              id: c.owner.id,
              name: c.owner.name,
              phone: c.owner.phoneNumber,
            }
          : null,
        ownerId: c.ownerId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
    };
  }

  async getChargerById(id: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    return {
      id: charger.id,
      name: charger.name,
      address: charger.address,
      lat: Number(charger.lat),
      lng: Number(charger.lng),
      status: charger.status,
      powerKw: Number(charger.powerKw),
      pricePerKwh: Number(charger.pricePerKwh),
      verified: charger.verified,
      description: charger.description,
      owner: charger.owner
        ? {
            id: charger.owner.id,
            name: charger.owner.name,
            phone: charger.owner.phoneNumber,
          }
        : null,
      ownerId: charger.ownerId,
      createdAt: charger.createdAt,
      updatedAt: charger.updatedAt,
    };
  }

  async approveCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ 
      where: { id },
      relations: ['owner']
    });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    charger.verified = true;
    charger.status = 'available'; // Make charger available when approved
    await this.chargerRepository.save(charger);
    
    // Send approval notification to owner
    try {
      await this.notificationsService.sendChargerApproved(
        charger.ownerId,
        charger.name || 'Your Charger',
        charger.id,
      );
    } catch (error) {
      console.error('Failed to send charger approval notification:', error);
    }
    
    return { message: 'Charger approved successfully' };
  }

  async rejectCharger(id: string, reason: string) {
    const charger = await this.chargerRepository.findOne({ 
      where: { id },
      relations: ['owner']
    });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    
    // Store charger info before deletion
    const ownerId = charger.ownerId;
    const chargerName = charger.name || 'Your Charger';
    
    // Delete the rejected charger completely
    await this.chargerRepository.remove(charger);
    
    // Send rejection notification to owner with reason
    try {
      await this.notificationsService.sendChargerRejected(
        ownerId,
        chargerName,
        reason,
      );
    } catch (error) {
      console.error('Failed to send charger rejection notification:', error);
    }
    
    return { 
      message: 'Charger rejected and removed successfully', 
      reason,
      ownerId 
    };
  }

  async updateCharger(id: string, data: Partial<Charger>) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    Object.assign(charger, data);
    await this.chargerRepository.save(charger);
    return { message: 'Charger updated successfully' };
  }

  async deleteCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    await this.chargerRepository.remove(charger);
    return { message: 'Charger deleted successfully' };
  }

  async getChargerAnalytics(id: string) {
    const charger = await this.chargerRepository.findOne({ 
      where: { id },
      relations: ['owner']
    });
    
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    // Get all bookings for this charger
    const bookings = await this.bookingRepository.find({
      where: { chargerId: id },
      order: { createdAt: 'DESC' },
    });

    // Calculate revenue data by month (last 12 months)
    const revenueData: Array<{ month: string; revenue: number; bookings: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === date.getMonth() && 
               bookingDate.getFullYear() === date.getFullYear() &&
               b.status === 'completed';
      });
      
      const revenue = monthBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
      
      revenueData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(revenue * 100) / 100,
        bookings: monthBookings.length,
      });
    }

    // Calculate utilization data by day (last 30 days)
    const utilizationData: Array<{ date: string; utilization: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === date.getTime();
      });

      // Calculate total hours used (assuming each booking is ~2 hours average)
      const hoursUsed = dayBookings.length * 2;
      const utilizationRate = Math.min((hoursUsed / 24) * 100, 100);

      utilizationData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        utilization: Math.round(utilizationRate * 10) / 10,
      });
    }

    // Calculate status distribution
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
    const activeCount = bookings.filter(b => b.status === 'active').length;
    const totalCount = bookings.length || 1; // Prevent division by zero

    const statusDistribution = [
      { status: 'Completed', count: completedCount, percentage: Math.round((completedCount / totalCount) * 100) },
      { status: 'Cancelled', count: cancelledCount, percentage: Math.round((cancelledCount / totalCount) * 100) },
      { status: 'Active', count: activeCount, percentage: Math.round((activeCount / totalCount) * 100) },
    ];

    // Calculate summary stats
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    
    const totalEnergyDelivered = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.energyConsumed) || 0), 0);

    return {
      revenueData,
      utilizationData,
      statusDistribution,
      summary: {
        totalBookings: bookings.length,
        completedBookings: completedCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEnergyDelivered: Math.round(totalEnergyDelivered * 100) / 100,
        averageBookingValue: bookings.length > 0 ? Math.round((totalRevenue / completedCount) * 100) / 100 : 0,
      },
    };
  }

  async banCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ 
      where: { id },
      relations: ['owner']
    });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    charger.isBanned = true;
    charger.status = 'offline'; // Set to offline when banned
    await this.chargerRepository.save(charger);
    
    // Send notification to owner
    try {
      await this.notificationsService.sendToUser(
        charger.ownerId,
        NotificationType.CHARGER_REJECTED,
        {
          title: 'Charger Suspended',
          body: `Your charger "${charger.name || 'Unnamed'}" has been suspended by admin. It is no longer available for bookings.`,
          data: { chargerId: charger.id }
        }
      );
    } catch (error) {
      console.error('Failed to send charger ban notification:', error);
    }
    
    return { message: 'Charger banned successfully' };
  }

  async unbanCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ 
      where: { id },
      relations: ['owner']
    });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    charger.isBanned = false;
    charger.status = 'available'; // Set back to available when unbanned
    await this.chargerRepository.save(charger);
    
    // Send notification to owner
    try {
      await this.notificationsService.sendToUser(
        charger.ownerId,
        NotificationType.CHARGER_APPROVED,
        {
          title: 'Charger Reinstated',
          body: `Your charger "${charger.name || 'Unnamed'}" has been reinstated by admin. It is now available for bookings again.`,
          data: { chargerId: charger.id }
        }
      );
    } catch (error) {
      console.error('Failed to send charger unban notification:', error);
    }
    
    return { message: 'Charger unbanned successfully' };
  }

  // Booking Management
  async getBookings(params: {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, limit, status, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.charger', 'charger');

    if (status) {
      const statuses = status.split(',');
      queryBuilder.where('booking.status IN (:...statuses)', { statuses });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'booking.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    const [bookings, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('booking.createdAt', 'DESC')
      .getManyAndCount();

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        userId: b.userId,
        chargerId: b.chargerId,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        totalCost: Number(b.price),
        energyConsumed: Number(b.energyConsumed) || 0,
        user: b.user
          ? {
              id: b.user.id,
              name: b.user.name,
              phone: b.user.phoneNumber,
            }
          : null,
        charger: b.charger
          ? {
              id: b.charger.id,
              name: b.charger.name,
              address: b.charger.address,
            }
          : null,
        createdAt: b.createdAt,
      })),
      total,
    };
  }

  async getBookingById(id: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'charger'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return {
      id: booking.id,
      userId: booking.userId,
      chargerId: booking.chargerId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      totalCost: Number(booking.price),
      energyConsumed: Number(booking.energyConsumed) || 0,
      user: booking.user
        ? {
            id: booking.user.id,
            name: booking.user.name,
            phone: booking.user.phoneNumber,
          }
        : null,
      charger: booking.charger
        ? {
            id: booking.charger.id,
            name: booking.charger.name,
            address: booking.charger.address,
          }
        : null,
      createdAt: booking.createdAt,
    };
  }

  async getBookingTimeline(id: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'charger'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Build timeline events based on booking data
    const timeline: Array<{
      time: string;
      event: string;
      status: 'completed' | 'pending' | 'cancelled';
      details?: string;
    }> = [];

    // Booking created
    timeline.push({
      time: booking.createdAt.toISOString(),
      event: 'Booking Created',
      status: 'completed',
      details: `Booking created by ${booking.user?.name || 'User'}`,
    });

    // Charging started
    if (booking.startTime) {
      timeline.push({
        time: booking.startTime.toISOString(),
        event: 'Charging Started',
        status: 'completed',
        details: `Started charging at ${booking.charger?.name || 'charger'}`,
      });

      // Calculate charging progress events based on energy consumed
      if (booking.energyConsumed && booking.status === 'completed') {
        const startTime = new Date(booking.startTime).getTime();
        const endTime = booking.endTime ? new Date(booking.endTime).getTime() : Date.now();
        const duration = endTime - startTime;

        // 25% charged
        timeline.push({
          time: new Date(startTime + duration * 0.25).toISOString(),
          event: '25% Charged',
          status: 'completed',
          details: `${Math.round(booking.energyConsumed * 0.25 * 100) / 100} kWh delivered`,
        });

        // 50% charged
        timeline.push({
          time: new Date(startTime + duration * 0.5).toISOString(),
          event: '50% Charged',
          status: 'completed',
          details: `${Math.round(booking.energyConsumed * 0.5 * 100) / 100} kWh delivered`,
        });

        // 75% charged
        timeline.push({
          time: new Date(startTime + duration * 0.75).toISOString(),
          event: '75% Charged',
          status: 'completed',
          details: `${Math.round(booking.energyConsumed * 0.75 * 100) / 100} kWh delivered`,
        });
      }
    }

    // Charging completed or cancelled
    if (booking.endTime && booking.status === 'completed') {
      timeline.push({
        time: booking.endTime.toISOString(),
        event: 'Charging Completed',
        status: 'completed',
        details: `Total energy: ${booking.energyConsumed} kWh, Cost: $${booking.price}`,
      });
    } else if (booking.status === 'cancelled') {
      timeline.push({
        time: (booking.updatedAt || booking.createdAt).toISOString(),
        event: 'Booking Cancelled',
        status: 'cancelled',
        details: 'Booking was cancelled',
      });
    } else if (booking.status === 'active') {
      timeline.push({
        time: new Date().toISOString(),
        event: 'Charging In Progress',
        status: 'pending',
        details: 'Charging is currently ongoing',
      });
    }

    // Generate energy consumption data if charging completed
    const energyData: Array<{ time: string; power: number; energy: number }> = [];
    
    if (booking.startTime && booking.energyConsumed && booking.status === 'completed') {
      const startTime = new Date(booking.startTime).getTime();
      const endTime = booking.endTime ? new Date(booking.endTime).getTime() : Date.now();
      const duration = (endTime - startTime) / (1000 * 60); // Duration in minutes
      const dataPoints = Math.min(20, Math.floor(duration / 5)); // Sample every 5 minutes or 20 points max

      for (let i = 0; i <= dataPoints; i++) {
        const progress = i / dataPoints;
        const timeOffset = Math.floor(progress * duration);
        
        // Simulate realistic power curve (starts high, tapers off near end)
        const basePower = booking.charger?.powerKw || 50;
        const powerVariation = progress < 0.8 
          ? basePower * (0.9 + Math.random() * 0.2) // 90-110% of rated power
          : basePower * (0.5 + Math.random() * 0.3); // Tapers to 50-80% near end

        energyData.push({
          time: `${timeOffset}m`,
          power: Math.round(powerVariation * 10) / 10,
          energy: Math.round(booking.energyConsumed * progress * 100) / 100,
        });
      }
    }

    return {
      timeline: timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
      energyData,
      summary: {
        totalEnergy: booking.energyConsumed || 0,
        totalCost: booking.price || 0,
        duration: booking.startTime && booking.endTime
          ? Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60))
          : 0,
        averagePower: booking.energyConsumed && booking.startTime && booking.endTime
          ? Math.round((booking.energyConsumed / ((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60))) * 10) / 10
          : 0,
      },
    };
  }

  async approveBooking(id: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    // Only allow approving bookings that are currently pending
    if (booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be approved');
    }

    booking.status = 'active';
    await this.bookingRepository.save(booking);
    
    return this.getBookingById(id);
  }

  async cancelBooking(id: string, reason?: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    // Prevent cancelling already completed or cancelled bookings
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel a ${booking.status} booking`);
    }

    booking.status = 'cancelled';
    await this.bookingRepository.save(booking);
    
    return this.getBookingById(id);
  }

  // Mechanic Application Management
  async getMechanicApplications(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.mechanicApplicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.user', 'user');

    if (search) {
      queryBuilder.where(
        '(application.name ILIKE :search OR application.phone ILIKE :search OR application.services::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      const statuses = status.split(',');
      queryBuilder.andWhere('application.status IN (:...statuses)', { statuses });
    }

    const [applications, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC')
      .getManyAndCount();

    return {
      applications: applications.map((a) => ({
        id: a.id,
        userId: a.userId,
        fullName: a.name,
        phoneNumber: a.phone,
        skills: a.services.join(', '),
        yearsOfExperience: a.yearsOfExperience,
        certifications: a.certifications,
        serviceArea: a.address,
        serviceLat: a.lat ? Number(a.lat) : null,
        serviceLng: a.lng ? Number(a.lng) : null,
        licenseNumber: a.licenseNumber,
        additionalInfo: a.description,
        status: a.status,
        reviewedBy: a.reviewedBy,
        reviewNotes: a.reviewNotes,
        reviewedAt: a.reviewedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        user: a.user ? {
          id: a.user.id,
          name: a.user.name,
          phone: a.user.phoneNumber,
        } : null,
      })),
      total,
    };
  }

  async getMechanicApplicationById(id: string) {
    const application = await this.mechanicApplicationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('Mechanic application not found');
    }

    return {
      id: application.id,
      userId: application.userId,
      fullName: application.name,
      phoneNumber: application.phone,
      skills: application.services.join(', '),
      yearsOfExperience: application.yearsOfExperience,
      certifications: application.certifications,
      serviceArea: application.address,
      serviceLat: application.lat ? Number(application.lat) : null,
      serviceLng: application.lng ? Number(application.lng) : null,
      licenseNumber: application.licenseNumber,
      additionalInfo: application.description,
      status: application.status,
      reviewedBy: application.reviewedBy,
      reviewNotes: application.reviewNotes,
      reviewedAt: application.reviewedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      user: application.user ? {
        id: application.user.id,
        name: application.user.name,
        phone: application.user.phoneNumber,
        role: application.user.role,
      } : null,
    };
  }

  async approveMechanicApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    const application = await this.mechanicApplicationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('Mechanic application not found');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException('Only pending applications can be approved');
    }

    // Update application status
    application.status = ApplicationStatus.APPROVED;
    application.reviewedBy = reviewedBy;
    application.reviewNotes = reviewNotes;
    application.reviewedAt = new Date();
    await this.mechanicApplicationRepository.save(application);

    // Create mechanic record
    const mechanic = this.mechanicRepository.create({
      userId: application.userId,
      name: application.name,
      specialization: application.services.join(', '),
      yearsOfExperience: application.yearsOfExperience,
      rating: 0,
      completedJobs: 0,
      available: true,
      services: application.services,
      lat: application.lat,
      lng: application.lng,
      phone: application.phone,
      licenseNumber: application.licenseNumber,
      certifications: application.certifications,
    });
    await this.mechanicRepository.save(mechanic);

    // Update user role to mechanic
    if (application.user) {
      application.user.role = 'mechanic';
      await this.userRepository.save(application.user);
    }

    return { message: 'Mechanic application approved successfully' };
  }

  async rejectMechanicApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    const application = await this.mechanicApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Mechanic application not found');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException('Only pending applications can be rejected');
    }

    application.status = ApplicationStatus.REJECTED;
    application.reviewedBy = reviewedBy;
    application.reviewNotes = reviewNotes;
    application.reviewedAt = new Date();
    await this.mechanicApplicationRepository.save(application);

    return { message: 'Mechanic application rejected successfully' };
  }

  // Mechanics Management
  async getMechanics(params: {
    page: number;
    limit: number;
    search?: string;
    available?: boolean;
  }) {
    const { page, limit, search, available } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.mechanicRepository
      .createQueryBuilder('mechanic')
      .leftJoinAndSelect('mechanic.user', 'user');

    if (search) {
      queryBuilder.where(
        '(mechanic.specialization ILIKE :search OR user.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (available !== undefined) {
      queryBuilder.andWhere('mechanic.available = :available', { available });
    }

    const [mechanics, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('mechanic.createdAt', 'DESC')
      .getManyAndCount();

    return {
      mechanics: mechanics.map((m) => ({
        id: m.id,
        userId: m.userId,
        specialization: m.specialization,
        yearsOfExperience: m.yearsOfExperience,
        rating: Number(m.rating) || 0,
        completedJobs: m.completedJobs || 0,
        available: m.available,
        services: m.services,
        lat: m.lat ? Number(m.lat) : null,
        lng: m.lng ? Number(m.lng) : null,
        licenseNumber: m.licenseNumber,
        certifications: m.certifications,
        user: m.user ? {
          id: m.user.id,
          name: m.user.name,
          phone: m.user.phoneNumber,
        } : null,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      total,
    };
  }

  async getMechanicById(id: string) {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    return {
      id: mechanic.id,
      userId: mechanic.userId,
      specialization: mechanic.specialization,
      yearsOfExperience: mechanic.yearsOfExperience,
      rating: Number(mechanic.rating) || 0,
      completedJobs: mechanic.completedJobs || 0,
      available: mechanic.available,
      services: mechanic.services,
      lat: mechanic.lat ? Number(mechanic.lat) : null,
      lng: mechanic.lng ? Number(mechanic.lng) : null,
      licenseNumber: mechanic.licenseNumber,
      certifications: mechanic.certifications,
      user: mechanic.user ? {
        id: mechanic.user.id,
        name: mechanic.user.name,
        phone: mechanic.user.phoneNumber,
        role: mechanic.user.role,
      } : null,
      createdAt: mechanic.createdAt,
      updatedAt: mechanic.updatedAt,
    };
  }

  async updateMechanic(id: string, data: Partial<MechanicEntity>) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }
    Object.assign(mechanic, data);
    await this.mechanicRepository.save(mechanic);
    return { message: 'Mechanic updated successfully' };
  }

  async deleteMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    // Update user role back to 'user'
    if (mechanic.user) {
      mechanic.user.role = 'user';
      await this.userRepository.save(mechanic.user);
    }

    await this.mechanicRepository.remove(mechanic);
    return { message: 'Mechanic deleted successfully' };
  }

  async banMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({ 
      where: { id },
      relations: ['user']
    });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }
    mechanic.isBanned = true;
    mechanic.available = false; // Set to unavailable when banned
    await this.mechanicRepository.save(mechanic);
    
    // Send notification to mechanic
    try {
      await this.notificationsService.sendToUser(
        mechanic.userId,
        NotificationType.SERVICE_COMPLETED,
        {
          title: 'Mechanic Account Suspended',
          body: 'Your mechanic account has been suspended by admin. You cannot accept new breakdown requests until reinstated.',
          data: { mechanicId: mechanic.id }
        }
      );
    } catch (error) {
      console.error('Failed to send mechanic ban notification:', error);
    }
    
    return { message: 'Mechanic banned successfully' };
  }

  async unbanMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({ 
      where: { id },
      relations: ['user']
    });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }
    mechanic.isBanned = false;
    mechanic.available = true; // Set back to available when unbanned
    await this.mechanicRepository.save(mechanic);
    
    // Send notification to mechanic
    try {
      await this.notificationsService.sendToUser(
        mechanic.userId,
        NotificationType.SERVICE_COMPLETED,
        {
          title: 'Mechanic Account Reinstated',
          body: 'Your mechanic account has been reinstated by admin. You can now accept breakdown requests again.',
          data: { mechanicId: mechanic.id }
        }
      );
    } catch (error) {
      console.error('Failed to send mechanic unban notification:', error);
    }
    
    return { message: 'Mechanic unbanned successfully' };
  }

  // Helper methods
  private generateDailyData(items: any[], start: Date, end: Date, type: string): any[] {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const data: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayItems = items.filter((item) => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      if (type === 'revenue') {
        data.push({
          date: dateStr,
          revenue: dayItems.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
          bookings: dayItems.length,
        });
      } else if (type === 'bookings') {
        data.push({
          date: dateStr,
          bookings: dayItems.length,
          revenue: dayItems.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
        });
      } else if (type === 'users') {
        const totalUsers = items.filter(
          (u) =>
            new Date(u.createdAt) <= date,
        ).length;
        data.push({
          date: dateStr,
          users: totalUsers,
          newUsers: dayItems.length,
        });
      } else {
        data.push({
          date: dateStr,
          count: dayItems.length,
        });
      }
    }

    return data;
  }

  private async getRevenueByLocation(bookings: BookingEntity[]) {
    const locationMap = new Map<string, { revenue: number; bookings: number }>();

    for (const booking of bookings) {
      if (booking.charger?.address) {
        const city = booking.charger.address.split(',')[1]?.trim() || 'Unknown';
        const existing = locationMap.get(city) || { revenue: 0, bookings: 0 };
        existing.revenue += Number(booking.price) || 0;
        existing.bookings += 1;
        locationMap.set(city, existing);
      }
    }

    return Array.from(locationMap.entries())
      .map(([location, data]) => ({
        location,
        revenue: Math.round(data.revenue * 100) / 100,
        bookings: data.bookings,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getChargerUtilization() {
    const chargers = await this.chargerRepository.find({
      take: 5,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      chargers.map(async (charger) => {
        const bookings = await this.bookingRepository.count({
          where: { chargerId: charger.id },
        });
        return {
          charger: charger.name || 'Unnamed Charger',
          utilization: Math.min(Math.round((bookings / 30) * 100), 100),
          hours: bookings * 2,
        };
      }),
    );
  }

  // ==================== NEW ADMIN CONTROL METHODS ====================

  /**
   * Suspend or resume a charger (admin override)
   */
  async suspendCharger(id: string, suspend: boolean, reason?: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    charger.status = suspend ? 'offline' : 'available';
    charger.metadata = {
      ...charger.metadata,
      adminSuspended: suspend,
      adminSuspendedReason: reason,
      adminSuspendedAt: suspend ? new Date() : null,
    };

    return this.chargerRepository.save(charger);
  }

  /**
   * Override charger status
   */
  async setChargerStatus(id: string, status: 'available' | 'in-use' | 'offline', reason?: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    charger.status = status;
    charger.metadata = {
      ...charger.metadata,
      adminStatusOverride: true,
      adminStatusReason: reason,
      adminStatusChangedAt: new Date(),
    };

    return this.chargerRepository.save(charger);
  }

  /**
   * Set price override for a charger
   */
  async setChargerPriceOverride(id: string, pricePerKwh: number, reason?: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    charger.metadata = {
      ...charger.metadata,
      originalPrice: charger.pricePerKwh,
      adminPriceOverride: pricePerKwh,
      adminPriceReason: reason,
      adminPriceChangedAt: new Date(),
    };
    charger.pricePerKwh = pricePerKwh;

    return this.chargerRepository.save(charger);
  }

  /**
   * Get charger owner details
   */
  async getChargerOwnerDetails(chargerId: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id: chargerId },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (!charger.owner) {
      throw new NotFoundException('Charger owner not found');
    }

    return {
      id: charger.owner.id,
      name: charger.owner.name,
      phone: charger.owner.phoneNumber,
      role: charger.owner.role,
      createdAt: charger.owner.createdAt,
    };
  }

  /**
   * Get marketplace listings with admin view
   */
  async getMarketplaceListings(filters: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const query = this.marketplaceRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.images', 'images');

    if (filters.status) {
      query.andWhere('listing.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        '(listing.title ILIKE :search OR listing.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('listing.createdAt', 'DESC');

    const [listings, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      listings,
      total,
      page: filters.page,
      pages: Math.ceil(total / filters.limit),
    };
  }

  /**
   * Approve marketplace listing
   */
  async approveMarketplaceListing(id: string, adminNotes?: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    listing.status = 'approved';
    listing.adminNotes = adminNotes || null;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Reject marketplace listing
   */
  async rejectMarketplaceListing(id: string, reason: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    listing.status = 'rejected';
    listing.adminNotes = reason;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Edit marketplace listing
   */
  async editMarketplaceListing(id: string, updates: any) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    Object.assign(listing, updates);

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Ban marketplace listing
   */
  async banMarketplaceListing(id: string) {
    const listing = await this.marketplaceRepository.findOne({ 
      where: { id },
      relations: ['seller']
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    
    listing.isBanned = true;
    listing.status = 'rejected'; // Set to rejected when banned
    await this.marketplaceRepository.save(listing);
    
    // Send notification to seller
    try {
      await this.notificationsService.sendToUser(
        listing.sellerId,
        NotificationType.LISTING_REJECTED,
        {
          title: 'Listing Suspended',
          body: `Your marketplace listing "${listing.title}" has been suspended by admin and is no longer visible.`,
          data: { listingId: listing.id }
        }
      );
    } catch (error) {
      console.error('Failed to send listing ban notification:', error);
    }
    
    return { message: 'Listing banned successfully' };
  }

  /**
   * Unban marketplace listing
   */
  async unbanMarketplaceListing(id: string) {
    const listing = await this.marketplaceRepository.findOne({ 
      where: { id },
      relations: ['seller']
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    
    listing.isBanned = false;
    listing.status = 'approved'; // Set back to approved when unbanned
    await this.marketplaceRepository.save(listing);
    
    // Send notification to seller
    try {
      await this.notificationsService.sendToUser(
        listing.sellerId,
        NotificationType.LISTING_APPROVED,
        {
          title: 'Listing Reinstated',
          body: `Your marketplace listing "${listing.title}" has been reinstated by admin and is now visible again.`,
          data: { listingId: listing.id }
        }
      );
    } catch (error) {
      console.error('Failed to send listing unban notification:', error);
    }
    
    return { message: 'Listing unbanned successfully' };
  }

  /**
   * Ban seller (prevents new listings)
   */
  async banSeller(sellerId: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException('Seller not found');
    }
    
    user.isBanned = true;
    await this.userRepository.save(user);
    
    // Ban all active listings by this seller
    const activeListings = await this.marketplaceRepository.find({
      where: { 
        sellerId,
        isBanned: false
      }
    });
    
    for (const listing of activeListings) {
      listing.isBanned = true;
      listing.status = 'rejected';
    }
    
    if (activeListings.length > 0) {
      await this.marketplaceRepository.save(activeListings);
    }
    
    // Send notification
    try {
      await this.notificationsService.sendToUser(
        sellerId,
        NotificationType.LISTING_REJECTED,
        {
          title: 'Seller Account Suspended',
          body: 'Your seller account has been suspended by admin. You cannot create new listings until reinstated.',
          data: { bannedListingsCount: activeListings.length.toString() }
        }
      );
    } catch (error) {
      console.error('Failed to send seller ban notification:', error);
    }
    
    return { 
      message: 'Seller banned successfully',
      bannedListingsCount: activeListings.length
    };
  }

  /**
   * Unban seller
   */
  async unbanSeller(sellerId: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException('Seller not found');
    }
    
    user.isBanned = false;
    await this.userRepository.save(user);
    
    // Send notification
    try {
      await this.notificationsService.sendToUser(
        sellerId,
        NotificationType.LISTING_APPROVED,
        {
          title: 'Seller Account Reinstated',
          body: 'Your seller account has been reinstated by admin. You can now create listings again.',
          data: {}
        }
      );
    } catch (error) {
      console.error('Failed to send seller unban notification:', error);
    }
    
    return { message: 'Seller unbanned successfully' };
  }

  /**
   * Suspend seller
   */
  async suspendSeller(sellerId: string, suspend: boolean, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException('Seller not found');
    }

    user.isBanned = suspend;
    await this.userRepository.save(user);

    return {
      success: true,
      sellerId,
      suspended: suspend,
      reason,
    };
  }

  /**
   * Verify mechanic
   */
  async verifyMechanic(id: string, verified: boolean, notes?: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    // Add admin verification status
    mechanic.available = verified;
    mechanic.description = notes
      ? `${mechanic.description || ''}\n\nAdmin Notes: ${notes}`.trim()
      : mechanic.description;

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * Suspend mechanic
   */
  async suspendMechanic(id: string, suspend: boolean, reason: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    mechanic.available = !suspend;
    mechanic.description = suspend
      ? `${mechanic.description || ''}\n\nSuspended by admin: ${reason}`.trim()
      : mechanic.description?.replace(/\n\nSuspended by admin:.*$/m, '').trim();

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * Get mechanic job history
   */
  async getMechanicJobs(mechanicId: string, page: number, limit: number) {
    // Stub - requires mechanic jobs tracking
    return {
      jobs: [],
      total: 0,
      page,
      pages: 0,
    };
  }

  // ==================== HOLD/RELEASE FUNCTIONALITY ====================

  /**
   * Hold an approved charger (temporarily disable while keeping approved status)
   */
  async holdCharger(id: string, reason: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (!charger.verified) {
      throw new BadRequestException('Can only hold approved/verified chargers');
    }

    const previousStatus = charger.status;
    charger.status = 'offline';
    charger.metadata = {
      ...charger.metadata,
      adminHeld: true,
      holdReason: reason,
      heldAt: new Date(),
      previousStatus: previousStatus,
    };

    return this.chargerRepository.save(charger);
  }

  /**
   * Release a held charger (restore to previous status)
   */
  async releaseCharger(id: string, notes?: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }

    if (!charger.metadata?.adminHeld) {
      throw new BadRequestException('Charger is not currently held');
    }

    const previousStatus = charger.metadata?.previousStatus || 'available';
    charger.status = previousStatus as any;
    charger.metadata = {
      ...charger.metadata,
      adminHeld: false,
      holdReason: null,
      heldAt: null,
      releasedAt: new Date(),
      releaseNotes: notes,
      previousStatus: null,
    };

    return this.chargerRepository.save(charger);
  }

  /**
   * Hold an approved marketplace listing
   */
  async holdListing(id: string, reason: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'approved') {
      throw new BadRequestException('Can only hold approved listings');
    }

    listing.status = 'pending'; // Move to pending to hide from marketplace
    listing.adminNotes = `HELD by admin: ${reason}\n\nPrevious notes: ${listing.adminNotes || 'None'}`;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Release a held marketplace listing
   */
  async releaseListing(id: string, notes?: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (!listing.adminNotes?.includes('HELD by admin')) {
      throw new BadRequestException('Listing is not currently held');
    }

    listing.status = 'approved';
    listing.adminNotes = notes 
      ? `RELEASED by admin: ${notes}\n\n${listing.adminNotes}`
      : listing.adminNotes.replace(/HELD by admin:.*?\n\n/s, '');

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Hold an approved mechanic
   */
  async holdMechanic(id: string, reason: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    if (!mechanic.available) {
      throw new BadRequestException('Mechanic is not currently active');
    }

    mechanic.available = false;
    mechanic.description = `[HELD BY ADMIN] ${reason}\n\n${mechanic.description || ''}`.trim();

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * Release a held mechanic
   */
  async releaseMechanic(id: string, notes?: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    if (!mechanic.description?.includes('[HELD BY ADMIN]')) {
      throw new BadRequestException('Mechanic is not currently held');
    }

    mechanic.available = true;
    mechanic.description = mechanic.description
      .replace(/\[HELD BY ADMIN\].*?\n\n/s, '')
      .trim();

    if (notes) {
      mechanic.description = `[RELEASED] ${notes}\n\n${mechanic.description}`.trim();
    }

    return this.mechanicRepository.save(mechanic);
  }

  // ── Admin OCPP Controls ────────────────────────────────────────────────────

  private async resolveOcppId(postgresChargerId: string): Promise<string> {
    const charger = await this.chargerRepository.findOne({ where: { id: postgresChargerId } });
    if (!charger) throw new NotFoundException('Charger not found');
    if (!charger.chargeBoxIdentity) {
      throw new HttpException('Charger has no OCPP identity — not yet registered with OCPP service', HttpStatus.BAD_REQUEST);
    }
    // Resolve to ev-charging-service internal UUID
    const ocppCharger = await this.chargingService.getChargerByIdentity(charger.chargeBoxIdentity);
    return ocppCharger.id;
  }

  async ocppResetCharger(chargerId: string, type: 'Soft' | 'Hard' = 'Soft') {
    const ocppId = await this.resolveOcppId(chargerId);
    return this.chargingService.resetCharger(ocppId, type);
  }

  async ocppUnlockConnector(chargerId: string, connectorId = 1) {
    const ocppId = await this.resolveOcppId(chargerId);
    return this.chargingService.unlockConnector(ocppId, connectorId);
  }

  async ocppSetAvailability(chargerId: string, connectorId: number, type: 'Operative' | 'Inoperative') {
    const ocppId = await this.resolveOcppId(chargerId);
    return this.chargingService.setAvailability(ocppId, connectorId, type);
  }

  async ocppGetActiveSessions(status?: string) {
    return this.chargingService.getAllSessions(status);
  }

  async ocppForceStopSession(sessionId: string) {
    return this.chargingService.forceStopSession(sessionId);
  }

  async ocppGetConnectedChargers() {
    return this.chargingService.getConnectedChargers();
  }
}
