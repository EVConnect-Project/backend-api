import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { MechanicApplication, ApplicationStatus } from '../mechanic/entities/mechanic-application.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';

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
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    const [totalUsers, totalChargers, totalBookings] = await Promise.all([
      this.userRepository.count(),
      this.chargerRepository.count(),
      this.bookingRepository.count(),
    ]);

    const activeUsers = await this.userRepository.count({
      where: { isBanned: false },
    });

    const availableChargers = await this.chargerRepository.count({
      where: { status: 'available' },
    });

    const bookings = await this.bookingRepository.find({
      where: { status: In(['completed']) },
    });

    const totalRevenue = bookings.reduce((sum, booking) => {
      return sum + (Number(booking.price) || 0);
    }, 0);

    // Calculate growth (simplified - comparing last 30 days to previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentRevenue = bookings
      .filter((b) => new Date(b.createdAt) >= thirtyDaysAgo)
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    const previousRevenue = bookings
      .filter(
        (b) =>
          new Date(b.createdAt) >= sixtyDaysAgo &&
          new Date(b.createdAt) < thirtyDaysAgo,
      )
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    const revenueGrowth =
      previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('EXTRACT(YEAR FROM user.createdAt) = :year', {
        year: new Date().getFullYear(),
      })
      .andWhere('EXTRACT(MONTH FROM user.createdAt) = :month', {
        month: new Date().getMonth() + 1,
      })
      .getCount();

    return {
      totalUsers,
      totalChargers,
      totalBookings,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeUsers,
      availableChargers,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      userGrowth: recentUsers,
    };
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
    const start = new Date(startDate);
    const end = new Date(endDate);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.createdAt BETWEEN :start AND :end', { start, end })
      .getMany();

    return this.generateDailyData(bookings, start, end, 'revenue');
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
        '(user.name ILIKE :search OR user.email ILIKE :search)',
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
        email: u.email,
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
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      status: user.isBanned ? 'banned' : 'active',
    };
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
  }) {
    const { page, limit, search, status, verified } = params;
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
        description: c.description,
        owner: c.owner
          ? {
              id: c.owner.id,
              name: c.owner.name,
              email: c.owner.email,
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
            email: charger.owner.email,
          }
        : null,
      ownerId: charger.ownerId,
      createdAt: charger.createdAt,
      updatedAt: charger.updatedAt,
    };
  }

  async approveCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    charger.verified = true;
    await this.chargerRepository.save(charger);
    return { message: 'Charger approved successfully' };
  }

  async rejectCharger(id: string, reason: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException('Charger not found');
    }
    charger.verified = false;
    await this.chargerRepository.save(charger);
    return { message: 'Charger rejected successfully', reason };
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
              email: b.user.email,
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
            email: booking.user.email,
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
        '(application.fullName ILIKE :search OR application.phoneNumber ILIKE :search OR application.skills ILIKE :search)',
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
        fullName: a.fullName,
        phoneNumber: a.phoneNumber,
        skills: a.skills,
        yearsOfExperience: a.yearsOfExperience,
        certifications: a.certifications,
        serviceArea: a.serviceArea,
        serviceLat: a.serviceLat ? Number(a.serviceLat) : null,
        serviceLng: a.serviceLng ? Number(a.serviceLng) : null,
        licenseNumber: a.licenseNumber,
        additionalInfo: a.additionalInfo,
        status: a.status,
        reviewedBy: a.reviewedBy,
        reviewNotes: a.reviewNotes,
        reviewedAt: a.reviewedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        user: a.user ? {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
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
      fullName: application.fullName,
      phoneNumber: application.phoneNumber,
      skills: application.skills,
      yearsOfExperience: application.yearsOfExperience,
      certifications: application.certifications,
      serviceArea: application.serviceArea,
      serviceLat: application.serviceLat ? Number(application.serviceLat) : null,
      serviceLng: application.serviceLng ? Number(application.serviceLng) : null,
      licenseNumber: application.licenseNumber,
      additionalInfo: application.additionalInfo,
      status: application.status,
      reviewedBy: application.reviewedBy,
      reviewNotes: application.reviewNotes,
      reviewedAt: application.reviewedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      user: application.user ? {
        id: application.user.id,
        name: application.user.name,
        email: application.user.email,
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
      name: application.fullName,
      specialization: application.skills,
      yearsOfExperience: application.yearsOfExperience,
      rating: 0,
      completedJobs: 0,
      available: true,
      services: application.skills.split(',').map(s => s.trim()),
      lat: application.serviceLat,
      lng: application.serviceLng,
      phone: application.phoneNumber,
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
          email: m.user.email,
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
        email: mechanic.user.email,
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
      email: charger.owner.email,
      phone: charger.owner.phone,
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
}
