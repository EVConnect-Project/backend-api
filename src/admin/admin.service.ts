import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, IsNull } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { UpdateUserRoleDto, UpdateChargerDto, GetUsersDto, GetChargersDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  // Dashboard Statistics
  async getDashboardStats() {
    const totalUsers = await this.userRepository.count();
    const totalChargers = await this.chargerRepository.count();
    const availableChargers = await this.chargerRepository.count({
      where: { status: 'available' },
    });

    // Get user growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await this.userRepository.count({
      where: {
        createdAt: Not(IsNull()),
      },
    });

    // Calculate growth percentage (mock for now - you can enhance this)
    const userGrowth = 12.5; // Mock percentage
    const revenueGrowth = 8.3; // Mock percentage

    return {
      totalUsers,
      totalChargers,
      availableChargers,
      totalBookings: 0, // Will be implemented when booking module is added
      totalRevenue: 0, // Will be implemented when booking module is added
      userGrowth,
      revenueGrowth,
    };
  }

  // User Management
  async getUsers(query: GetUsersDto) {
    const { search, role, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.email = Like(`%${search}%`);
    }

    if (role) {
      whereConditions.role = role;
    }

    if (status === 'banned') {
      whereConditions.isBanned = true;
    } else if (status === 'active') {
      whereConditions.isBanned = false;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'isVerified', 'isBanned', 'createdAt', 'updatedAt'],
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'isVerified', 'isBanned', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async banUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    user.isBanned = true;
    await this.userRepository.save(user);

    return { message: 'User banned successfully', user };
  }

  async unbanUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    user.isBanned = false;
    await this.userRepository.save(user);

    return { message: 'User unbanned successfully', user };
  }

  async updateUserRole(id: string, updateUserRoleDto: UpdateUserRoleDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    user.role = updateUserRoleDto.role;
    await this.userRepository.save(user);

    return { message: 'User role updated successfully', user };
  }

  // Charger Management
  async getChargers(query: GetChargersDto) {
    const { status, verified, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (status) {
      whereConditions.status = status;
    }

    if (verified !== undefined) {
      whereConditions.verified = verified === 'true';
    }

    const [chargers, total] = await this.chargerRepository.findAndCount({
      where: whereConditions,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['owner'],
    });

    return {
      chargers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new Error('Charger not found');
    }

    charger.verified = true;
    await this.chargerRepository.save(charger);

    return { message: 'Charger approved successfully', charger };
  }

  async rejectCharger(id: string, reason: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new Error('Charger not found');
    }

    // In a real app, you might want to notify the owner about the rejection
    // For now, we'll just delete it or mark it as rejected
    await this.chargerRepository.remove(charger);

    return { message: `Charger rejected: ${reason}` };
  }

  async updateCharger(id: string, updateChargerDto: UpdateChargerDto) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new Error('Charger not found');
    }

    Object.assign(charger, updateChargerDto);
    await this.chargerRepository.save(charger);

    return { message: 'Charger updated successfully', charger };
  }

  // Analytics
  async getRevenueData(startDate: string, endDate: string) {
    // Mock data for now - will be real when booking/payment module is added
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const data: Array<{ date: string; revenue: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 1000) + 500, // Mock revenue
      });
    }

    return data;
  }

  async getUserGrowthData(period: string = '30d') {
    // Mock data for now
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 90;
    const data: Array<{ date: string; users: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 10,
      });
    }

    return data;
  }

  async getBookingStats() {
    // Mock data for now - will be real when booking module is added
    const data: Array<{ date: string; bookings: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        bookings: Math.floor(Math.random() * 30) + 5,
      });
    }

    return data;
  }
}
