import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ChargingService } from "../charging/charging.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Like, ILike } from "typeorm";
import { UserEntity } from "../users/entities/user.entity";
import { Charger } from "../charger/entities/charger.entity";
import { ChargingStation } from "../owner/entities/charging-station.entity";
import { ChargerSocket } from "../owner/entities/charger-socket.entity";
import { BookingEntity } from "../bookings/entities/booking.entity";
import {
  MechanicApplication,
  ApplicationStatus,
} from "../mechanic/entities/mechanic-application.entity";
import { MechanicEntity } from "../mechanics/entities/mechanic.entity";
import { MarketplaceListing } from "../marketplace/entities/marketplace-listing.entity";
import {
  OwnerPaymentAccount,
  VerificationStatus,
} from "../owner/entities/owner-payment-account.entity";
import { VehicleProfile } from "../auth/entities/vehicle-profile.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/types/notification-types";
import { NotificationLogEntity } from "../notifications/entities/notification-log.entity";
import { ServiceStationApplicationEntity } from "../service-stations/entities/service-station-application.entity";
import { ServiceStationEntity } from "../service-stations/entities/service-station.entity";
import { PaymentEntity } from "../payments/entities/payment.entity";
import { OwnerPayout, OwnerPayoutStatus } from "./entities/owner-payout.entity";
import { OwnerPayoutItem } from "./entities/owner-payout-item.entity";

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
    @InjectRepository(ChargingStation)
    private chargingStationRepository: Repository<ChargingStation>,
    @InjectRepository(ChargerSocket)
    private chargerSocketRepository: Repository<ChargerSocket>,
    @InjectRepository(VehicleProfile)
    private vehicleProfileRepository: Repository<VehicleProfile>,
    @InjectRepository(NotificationLogEntity)
    private notificationLogRepository: Repository<NotificationLogEntity>,
    @InjectRepository(ServiceStationApplicationEntity)
    private serviceStationApplicationRepository: Repository<ServiceStationApplicationEntity>,
    @InjectRepository(ServiceStationEntity)
    private serviceStationRepository: Repository<ServiceStationEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(OwnerPayout)
    private ownerPayoutRepository: Repository<OwnerPayout>,
    @InjectRepository(OwnerPayoutItem)
    private ownerPayoutItemRepository: Repository<OwnerPayoutItem>,
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
        where: { currentStatus: "available" as any },
      });

      console.log("About to query user growth...");
      // Calculate user growth for current month
      const recentUsers = await this.userRepository
        .createQueryBuilder("user")
        .where("EXTRACT(YEAR FROM user.createdAt) = :year", {
          year: new Date().getFullYear(),
        })
        .andWhere("EXTRACT(MONTH FROM user.createdAt) = :month", {
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
      console.error("Error in getDashboardStats:", error.message);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  // Analytics
  async getAnalytics(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const bookings = await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.createdAt BETWEEN :start AND :end", { start, end })
      .leftJoinAndSelect("booking.user", "user")
      .leftJoinAndSelect("booking.charger", "charger")
      .getMany();

    const users = await this.userRepository
      .createQueryBuilder("user")
      .where("user.createdAt BETWEEN :start AND :end", { start, end })
      .getMany();

    // User growth data
    const userGrowth = this.generateDailyData(users, start, end, "users");

    // Revenue by location (simplified)
    const revenueByLocation = await this.getRevenueByLocation(bookings);

    // Charger utilization
    const chargerUtilization = await this.getChargerUtilization();

    // Booking trends
    const bookingTrends = this.generateDailyData(
      bookings,
      start,
      end,
      "bookings",
    );

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (Number(b.price) || 0),
      0,
    );
    const completedBookings = bookings.filter((b) => b.status === "completed");

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
        peakHour: "6:00 PM",
      },
    };
  }

  async getRevenueData(startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const bookings = await this.bookingRepository
        .createQueryBuilder("booking")
        .where("booking.createdAt BETWEEN :start AND :end", { start, end })
        .getMany();

      return this.generateDailyData(bookings, start, end, "revenue");
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      // Return empty data for the date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      return this.generateDailyData([], start, end, "revenue");
    }
  }

  async getUserGrowthData(period: string) {
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.userRepository
      .createQueryBuilder("user")
      .where("user.createdAt >= :startDate", { startDate })
      .getMany();

    return this.generateDailyData(users, startDate, new Date(), "count");
  }

  async getBookingStats() {
    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      activeBookings,
    ] = await Promise.all([
      this.bookingRepository.count(),
      this.bookingRepository.count({ where: { status: "completed" } }),
      this.bookingRepository.count({ where: { status: "cancelled" } }),
      this.bookingRepository.count({ where: { status: "active" } }),
    ]);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      activeBookings,
    };
  }

  // Vehicle Analytics
  async getVehicleAnalytics() {
    const vehicles = await this.vehicleProfileRepository.find();
    const totalVehicles = vehicles.length;

    // Vehicle type distribution (make-based)
    const makeCount: Record<string, number> = {};
    vehicles.forEach((v) => {
      const make = (v.make || "Unknown").toLowerCase();
      makeCount[make] = (makeCount[make] || 0) + 1;
    });
    const vehicleTypeDistribution = Object.entries(makeCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Connector type distribution across all vehicles
    const connectorCount: Record<string, number> = {};
    vehicles.forEach((v) => {
      const connectors: string[] = v.connectorTypes || [];
      connectors.forEach((c) => {
        connectorCount[c] = (connectorCount[c] || 0) + 1;
      });
    });
    const connectorTypeDistribution = Object.entries(connectorCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Available charger connector types from sockets
    const chargerSockets = await this.chargerSocketRepository
      .createQueryBuilder("socket")
      .select("LOWER(socket.connectorType)", "connectorType")
      .addSelect("COUNT(*)", "count")
      .groupBy("LOWER(socket.connectorType)")
      .getRawMany();

    // Compatibility match rate: % of vehicles that have at least one matching charger connector
    const chargerConnectors = new Set(
      chargerSockets.map((s) => s.connectorType?.toLowerCase()),
    );
    let matchedVehicles = 0;
    vehicles.forEach((v) => {
      const vehicleConnectors: string[] = v.connectorTypes || [];
      if (
        vehicleConnectors.some((vc) => chargerConnectors.has(vc.toLowerCase()))
      ) {
        matchedVehicles++;
      }
    });
    const compatibilityMatchRate =
      totalVehicles > 0
        ? Math.round((matchedVehicles / totalVehicles) * 100)
        : 0;

    // Power distribution
    const powerBuckets = {
      "Under 7 kW": 0,
      "7-22 kW": 0,
      "22-50 kW": 0,
      "50-150 kW": 0,
      "150+ kW": 0,
    };
    vehicles.forEach((v) => {
      const maxPower = Math.max(
        Number(v.maxAcChargingPower) || 0,
        Number(v.maxDcChargingPower) || 0,
      );
      if (maxPower < 7) powerBuckets["Under 7 kW"]++;
      else if (maxPower < 22) powerBuckets["7-22 kW"]++;
      else if (maxPower < 50) powerBuckets["22-50 kW"]++;
      else if (maxPower < 150) powerBuckets["50-150 kW"]++;
      else powerBuckets["150+ kW"]++;
    });
    const powerDistribution = Object.entries(powerBuckets).map(
      ([name, count]) => ({ name, count }),
    );

    // Vehicles registered over time (monthly)
    const vehicleGrowth = await this.vehicleProfileRepository
      .createQueryBuilder("vp")
      .select("TO_CHAR(vp.createdAt, 'YYYY-MM')", "month")
      .addSelect("COUNT(*)", "count")
      .groupBy("TO_CHAR(vp.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(vp.createdAt, 'YYYY-MM')", "ASC")
      .getRawMany();

    return {
      totalVehicles,
      vehicleTypeDistribution,
      connectorTypeDistribution,
      compatibilityMatchRate,
      matchedVehicles,
      totalChargerConnectors: chargerSockets.length,
      chargerConnectorDistribution: chargerSockets.map((s) => ({
        name: s.connectorType,
        count: parseInt(s.count),
      })),
      powerDistribution,
      vehicleGrowth: vehicleGrowth.map((g) => ({
        month: g.month,
        count: parseInt(g.count),
      })),
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

    const queryBuilder = this.userRepository.createQueryBuilder("user");

    if (search) {
      queryBuilder.where(
        "(user.name ILIKE :search OR user.phoneNumber ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (role) {
      const roles = role.split(",");
      queryBuilder.andWhere("user.role IN (:...roles)", { roles });
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("user.createdAt", "DESC")
      .getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phoneNumber,
        role: u.role,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
        status: u.isBanned ? "banned" : "active",
      })),
      total,
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phoneNumber,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      status: user.isBanned ? "banned" : "active",
    };
  }

  async getUserPaymentAccounts(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const paymentAccounts = await this.paymentAccountRepository.find({
      where: { userId },
      order: { isPrimary: "DESC", createdAt: "DESC" },
    });

    return paymentAccounts.map((account) => ({
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

  async getPaymentAccountVerificationQueue(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const qb = this.paymentAccountRepository
      .createQueryBuilder("account")
      .leftJoin(UserEntity, "user", "user.id = account.userId")
      .where("account.isActive = true")
      .select("account.id", "accountId")
      .addSelect("account.userId", "userId")
      .addSelect("user.name", "userName")
      .addSelect("user.phoneNumber", "userPhone")
      .addSelect("account.accountHolderName", "accountHolderName")
      .addSelect("account.bankName", "bankName")
      .addSelect("account.accountNumber", "accountNumber")
      .addSelect("account.accountType", "accountType")
      .addSelect("account.branchCode", "branchCode")
      .addSelect("account.verificationStatus", "verificationStatus")
      .addSelect("account.verificationNotes", "verificationNotes")
      .addSelect("account.isPrimary", "isPrimary")
      .addSelect("account.createdAt", "createdAt")
      .addSelect("account.updatedAt", "updatedAt")
      .orderBy("account.createdAt", "DESC");

    if (status && status !== "all") {
      qb.andWhere("account.verificationStatus = :status", { status });
    }

    if (search && search.trim()) {
      qb.andWhere(
        "(user.name ILIKE :search OR user.phoneNumber ILIKE :search OR account.bankName ILIKE :search OR account.accountHolderName ILIKE :search OR account.accountNumber ILIKE :search)",
        { search: `%${search.trim()}%` },
      );
    }

    const total = await qb.clone().getCount();
    const rows = await qb.skip(skip).take(limit).getRawMany();

    const items = rows.map((row) => {
      const rawAccountNumber = row.accountNumber as string;
      const accountNumberMasked = rawAccountNumber
        ? rawAccountNumber.length > 4
          ? `****${rawAccountNumber.slice(-4)}`
          : rawAccountNumber
        : null;

      return {
        accountId: row.accountId,
        userId: row.userId,
        userName: row.userName || "Unknown user",
        userPhone: row.userPhone || null,
        accountHolderName: row.accountHolderName || null,
        bankName: row.bankName || null,
        accountNumberMasked,
        accountType: row.accountType || null,
        branchCode: row.branchCode || null,
        verificationStatus: row.verificationStatus,
        verificationNotes: row.verificationNotes || null,
        isPrimary: !!row.isPrimary,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePaymentAccountVerification(
    accountId: string,
    dto: { status: string; notes?: string },
  ) {
    const statusValue = dto.status?.toLowerCase();
    const validStatuses = [
      VerificationStatus.PENDING,
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED,
    ];

    if (
      !statusValue ||
      !validStatuses.includes(statusValue as VerificationStatus)
    ) {
      throw new BadRequestException("Invalid verification status");
    }

    const account = await this.paymentAccountRepository.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException("Payment account not found");
    }

    account.verificationStatus = statusValue as VerificationStatus;
    account.verificationNotes = dto.notes?.trim() || null;
    await this.paymentAccountRepository.save(account);

    const masked = account.accountNumber
      ? account.accountNumber.length > 4
        ? `****${account.accountNumber.slice(-4)}`
        : account.accountNumber
      : null;

    return {
      message: "Payment account verification updated",
      account: {
        accountId: account.id,
        userId: account.userId,
        verificationStatus: account.verificationStatus,
        verificationNotes: account.verificationNotes,
        accountNumberMasked: masked,
        updatedAt: account.updatedAt,
      },
    };
  }

  async banUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.isBanned = true;
    await this.userRepository.save(user);
    return { message: "User banned successfully" };
  }

  async unbanUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.isBanned = false;
    await this.userRepository.save(user);
    return { message: "User unbanned successfully" };
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.role = role;
    await this.userRepository.save(user);
    return { message: "User role updated successfully" };
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent deleting admin users
    if (user.role === "admin") {
      throw new BadRequestException("Cannot delete admin users");
    }

    // The cascade delete in the database schema will handle related records
    await this.userRepository.remove(user);

    return { message: "User permanently deleted" };
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
      .createQueryBuilder("charger")
      .leftJoinAndSelect("charger.owner", "owner")
      .leftJoinAndSelect("charger.sockets", "sockets");

    if (search) {
      queryBuilder.where(
        "(charger.name ILIKE :search OR charger.address ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (status) {
      const statuses = status.split(",");
      queryBuilder.andWhere("charger.status IN (:...statuses)", { statuses });
    }

    if (verified !== undefined) {
      queryBuilder.andWhere("charger.verified = :verified", { verified });
    }

    if (banned !== undefined) {
      queryBuilder.andWhere("charger.isBanned = :banned", { banned });
    }

    const [chargers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("charger.createdAt", "DESC")
      .getManyAndCount();

    // Batch-fetch station names for chargers that belong to a station
    const stationIds = [
      ...new Set(chargers.map((c) => c.stationId).filter(Boolean)),
    ] as string[];
    const stationMap: Record<string, string> = {};
    if (stationIds.length > 0) {
      const stations = await this.chargingStationRepository
        .createQueryBuilder("s")
        .select(["s.id", "s.stationName"])
        .where("s.id IN (:...ids)", { ids: stationIds })
        .getMany();
      for (const s of stations) {
        stationMap[s.id] = s.stationName;
      }
    }

    return {
      chargers: chargers.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        lat: Number(c.lat),
        lng: Number(c.lng),
        status: c.status,
        chargerType: c.chargerType || null,
        maxPowerKw: Number(c.maxPowerKw || 0),
        powerKw: Number(c.powerKw),
        pricePerKwh: Number(c.pricePerKwh),
        connectorType: c.connectorType || null,
        speedType: c.speedType || null,
        numberOfPlugs: c.numberOfPlugs || 1,
        bookingMode: c.bookingMode || null,
        isOnline: c.isOnline || false,
        verified: c.verified,
        isBanned: c.isBanned,
        description: c.description,
        chargeBoxIdentity: c.chargeBoxIdentity || null,
        stationId: c.stationId || null,
        stationName: c.stationId ? stationMap[c.stationId] || null : null,
        amenities: c.amenities || null,
        phoneNumber: c.phoneNumber || null,
        socketsCount: c.sockets ? c.sockets.length : 0,
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
      relations: ["owner", "sockets"],
    });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }

    // Fetch station name if charger belongs to a station
    let stationName: string | null = null;
    if (charger.stationId) {
      const station = await this.chargingStationRepository.findOne({
        where: { id: charger.stationId },
      });
      if (station) stationName = station.stationName;
    }

    return {
      id: charger.id,
      name: charger.name,
      address: charger.address,
      lat: Number(charger.lat),
      lng: Number(charger.lng),
      status: charger.status,
      chargerType: charger.chargerType || null,
      maxPowerKw: Number(charger.maxPowerKw || 0),
      powerKw: Number(charger.powerKw),
      pricePerKwh: Number(charger.pricePerKwh),
      connectorType: charger.connectorType || null,
      speedType: charger.speedType || null,
      numberOfPlugs: charger.numberOfPlugs || 1,
      bookingMode: charger.bookingMode || null,
      bookingSettings: charger.bookingSettings || null,
      openingHours: charger.openingHours || null,
      isOnline: charger.isOnline || false,
      ocppStatus: charger.ocppStatus || "not_configured",
      chargeBoxIdentity: charger.chargeBoxIdentity || null,
      currentStatus: charger.currentStatus || null,
      lastStatusUpdate: charger.lastStatusUpdate || null,
      lastHeartbeat: charger.lastHeartbeat || null,
      verified: charger.verified,
      isBanned: charger.isBanned,
      description: charger.description,
      amenities: charger.amenities || null,
      phoneNumber: charger.phoneNumber || null,
      googleMapUrl: charger.googleMapUrl || null,
      chargerIdentifier: charger.chargerIdentifier || null,
      reliabilityScore: Number(charger.reliabilityScore || 0),
      requiresAuth: charger.requiresAuth,
      requiresPhysicalCheck: charger.requiresPhysicalCheck,
      hasOccupancySensor: charger.hasOccupancySensor,
      paymentAccountId: charger.paymentAccountId || null,
      stationId: charger.stationId || null,
      stationName,
      sockets: (charger.sockets || []).map((s) => ({
        id: s.id,
        socketNumber: s.socketNumber,
        socketLabel: s.socketLabel || null,
        connectorType: s.connectorType,
        maxPowerKw: Number(s.maxPowerKw),
        pricePerKwh: s.pricePerKwh ? Number(s.pricePerKwh) : null,
        pricePerHour: s.pricePerHour ? Number(s.pricePerHour) : null,
        isFree: s.isFree,
        bookingMode: s.bookingMode,
        status: s.status,
      })),
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
    console.log(`✅ [AdminService] Approving charger: ${id}`);

    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ["owner"],
    });
    if (!charger) {
      console.error(`❌ [AdminService] Charger not found: ${id}`);
      throw new NotFoundException("Charger not found");
    }

    console.log(`📝 [AdminService] Current charger state:`, {
      id: charger.id,
      name: charger.name,
      verified: charger.verified,
      status: charger.status,
      ownerId: charger.ownerId,
    });

    charger.verified = true;
    charger.status = "available"; // Make charger available when approved
    const updatedCharger = await this.chargerRepository.save(charger);

    console.log(`✅ [AdminService] Charger updated:`, {
      id: updatedCharger.id,
      verified: updatedCharger.verified,
      status: updatedCharger.status,
    });

    // Promote the owner's role to 'owner' so they can access the Owner Dashboard
    const owner =
      charger.owner ??
      (await this.userRepository.findOne({ where: { id: charger.ownerId } }));
    if (owner && owner.role !== "owner" && owner.role !== "admin") {
      owner.role = "owner";
      await this.userRepository.save(owner);
      console.log(
        `✅ [AdminService] User ${owner.phoneNumber} promoted to 'owner' role`,
      );
    }

    // Send approval notification to owner
    try {
      console.log(
        `📧 [AdminService] Sending approval notification to owner: ${charger.ownerId}`,
      );
      await this.notificationsService.sendChargerApproved(
        charger.ownerId,
        charger.name || "Your Charger",
        charger.id,
      );
      console.log(`✅ [AdminService] Notification sent successfully`);
    } catch (error) {
      console.error("❌ Failed to send charger approval notification:", error);
    }

    return {
      id: updatedCharger.id,
      name: updatedCharger.name,
      address: updatedCharger.address,
      verified: updatedCharger.verified,
      status: updatedCharger.status,
      message: "Charger approved successfully",
    };
  }

  async rejectCharger(id: string, reason: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ["owner"],
    });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }

    // Store charger info before deletion
    const ownerId = charger.ownerId;
    const chargerName = charger.name || "Your Charger";

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
      console.error("Failed to send charger rejection notification:", error);
    }

    return {
      message: "Charger rejected and removed successfully",
      reason,
      ownerId,
    };
  }

  async updateCharger(id: string, data: Partial<Charger>) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }
    Object.assign(charger, data);
    await this.chargerRepository.save(charger);
    return { message: "Charger updated successfully" };
  }

  async deleteCharger(id: string) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }
    await this.chargerRepository.remove(charger);
    return { message: "Charger deleted successfully" };
  }

  async getChargerAnalytics(id: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ["owner"],
    });

    if (!charger) {
      throw new NotFoundException("Charger not found");
    }

    // Get all bookings for this charger
    const bookings = await this.bookingRepository.find({
      where: { chargerId: id },
      order: { createdAt: "DESC" },
    });

    // Calculate revenue data by month (last 12 months)
    const revenueData: Array<{
      month: string;
      revenue: number;
      bookings: number;
    }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.createdAt);
        return (
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getFullYear() === date.getFullYear() &&
          b.status === "completed"
        );
      });

      const revenue = monthBookings.reduce(
        (sum, b) => sum + (Number(b.price) || 0),
        0,
      );

      revenueData.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
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

      const dayBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.createdAt);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === date.getTime();
      });

      // Calculate total hours used (assuming each booking is ~2 hours average)
      const hoursUsed = dayBookings.length * 2;
      const utilizationRate = Math.min((hoursUsed / 24) * 100, 100);

      utilizationData.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        utilization: Math.round(utilizationRate * 10) / 10,
      });
    }

    // Calculate status distribution
    const completedCount = bookings.filter(
      (b) => b.status === "completed",
    ).length;
    const cancelledCount = bookings.filter(
      (b) => b.status === "cancelled",
    ).length;
    const activeCount = bookings.filter((b) => b.status === "active").length;
    const totalCount = bookings.length || 1; // Prevent division by zero

    const statusDistribution = [
      {
        status: "Completed",
        count: completedCount,
        percentage: Math.round((completedCount / totalCount) * 100),
      },
      {
        status: "Cancelled",
        count: cancelledCount,
        percentage: Math.round((cancelledCount / totalCount) * 100),
      },
      {
        status: "Active",
        count: activeCount,
        percentage: Math.round((activeCount / totalCount) * 100),
      },
    ];

    // Calculate summary stats
    const totalRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    const totalEnergyDelivered = bookings
      .filter((b) => b.status === "completed")
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
        averageBookingValue:
          bookings.length > 0
            ? Math.round((totalRevenue / completedCount) * 100) / 100
            : 0,
      },
    };
  }

  async banCharger(id: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ["owner"],
    });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }
    charger.isBanned = true;
    charger.status = "offline"; // Set to offline when banned
    await this.chargerRepository.save(charger);

    // Send notification to owner
    try {
      await this.notificationsService.sendToUser(
        charger.ownerId,
        NotificationType.CHARGER_REJECTED,
        {
          title: "Charger Suspended",
          body: `Your charger "${charger.name || "Unnamed"}" has been suspended by admin. It is no longer available for bookings.`,
          data: { chargerId: charger.id },
        },
      );
    } catch (error) {
      console.error("Failed to send charger ban notification:", error);
    }

    return { message: "Charger banned successfully" };
  }

  async unbanCharger(id: string) {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ["owner"],
    });
    if (!charger) {
      throw new NotFoundException("Charger not found");
    }
    charger.isBanned = false;
    charger.status = "available"; // Set back to available when unbanned
    await this.chargerRepository.save(charger);

    // Send notification to owner
    try {
      await this.notificationsService.sendToUser(
        charger.ownerId,
        NotificationType.CHARGER_APPROVED,
        {
          title: "Charger Reinstated",
          body: `Your charger "${charger.name || "Unnamed"}" has been reinstated by admin. It is now available for bookings again.`,
          data: { chargerId: charger.id },
        },
      );
    } catch (error) {
      console.error("Failed to send charger unban notification:", error);
    }

    return { message: "Charger unbanned successfully" };
  }

  // Charging Station Management
  async getStations(params: {
    page: number;
    limit: number;
    search?: string;
    verified?: boolean;
  }) {
    const { page, limit, search, verified } = params;
    const skip = (page - 1) * limit;

    const query = this.chargingStationRepository
      .createQueryBuilder("station")
      .leftJoinAndSelect("station.owner", "owner")
      .orderBy("station.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        "(station.stationName ILIKE :search OR station.address ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (verified !== undefined) {
      query.andWhere("station.verified = :verified", { verified });
    }

    const [stations, total] = await query.getManyAndCount();

    // Get charger counts for each station
    const stationIds = stations.map((s) => s.id);
    let chargerCountMap: Record<string, number> = {};
    if (stationIds.length > 0) {
      const chargerCounts = await this.chargerRepository
        .createQueryBuilder("charger")
        .select("charger.stationId", "stationId")
        .addSelect("COUNT(*)", "count")
        .where("charger.stationId IN (:...stationIds)", { stationIds })
        .groupBy("charger.stationId")
        .getRawMany();
      chargerCountMap = chargerCounts.reduce(
        (acc, row) => {
          acc[row.stationId] = parseInt(row.count);
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    return {
      data: stations.map((station) => ({
        id: station.id,
        stationName: station.stationName,
        address: station.address,
        stationType: station.stationType,
        lat: station.lat,
        lng: station.lng,
        parkingCapacity: station.parkingCapacity,
        amenities: station.amenities,
        openingHours: station.openingHours,
        images: station.images,
        verified: station.verified,
        isBanned: station.isBanned,
        createdAt: station.createdAt,
        updatedAt: station.updatedAt,
        chargersCount: chargerCountMap[station.id] || 0,
        owner: station.owner
          ? {
              id: station.owner.id,
              name: station.owner.name,
              email: station.owner.phoneNumber,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStationById(id: string) {
    const station = await this.chargingStationRepository.findOne({
      where: { id },
      relations: ["owner"],
    });

    if (!station) {
      throw new NotFoundException("Charging station not found");
    }

    // Fetch chargers belonging to this station
    const chargers = await this.chargerRepository.find({
      where: { stationId: id },
      relations: ["sockets"],
      order: { createdAt: "DESC" },
    });

    return {
      id: station.id,
      stationName: station.stationName,
      locationUrl: station.locationUrl,
      stationType: station.stationType,
      lat: station.lat,
      lng: station.lng,
      address: station.address,
      parkingCapacity: station.parkingCapacity,
      description: station.description,
      amenities: station.amenities,
      openingHours: station.openingHours,
      images: station.images,
      verified: station.verified,
      isBanned: station.isBanned,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
      owner: station.owner
        ? {
            id: station.owner.id,
            name: station.owner.name,
            email: station.owner.phoneNumber,
            phone: station.owner.phoneNumber,
          }
        : null,
      chargers: chargers.map((c) => ({
        id: c.id,
        name: c.name,
        chargerType: c.chargerType,
        maxPowerKw: c.maxPowerKw,
        connectorType: c.connectorType,
        speedType: c.speedType,
        status: c.status,
        currentStatus: c.currentStatus,
        isOnline: c.isOnline,
        verified: c.verified,
        isBanned: c.isBanned,
        pricePerKwh: c.pricePerKwh,
        bookingMode: c.bookingMode,
        socketsCount: c.sockets?.length || 0,
        sockets: c.sockets?.map((s) => ({
          id: s.id,
          socketNumber: s.socketNumber,
          socketLabel: s.socketLabel,
          connectorType: s.connectorType,
          maxPowerKw: s.maxPowerKw,
          pricePerKwh: s.pricePerKwh,
          status: s.status,
        })),
      })),
    };
  }

  async updateStation(id: string, data: any) {
    const station = await this.chargingStationRepository.findOne({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Charging station not found");
    }

    // Update allowed fields
    const allowedFields = [
      "stationName",
      "address",
      "stationType",
      "lat",
      "lng",
      "locationUrl",
      "parkingCapacity",
      "description",
      "amenities",
      "openingHours",
      "verified",
      "isBanned",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (station as any)[field] = data[field];
      }
    }

    await this.chargingStationRepository.save(station);

    return { message: "Station updated successfully", station };
  }

  async deleteStation(id: string) {
    const station = await this.chargingStationRepository.findOne({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Charging station not found");
    }

    // Check if station has chargers
    const chargerCount = await this.chargerRepository.count({
      where: { stationId: id },
    });

    if (chargerCount > 0) {
      // Unlink chargers from station (set stationId to null)
      await this.chargerRepository
        .createQueryBuilder()
        .update(Charger)
        .set({ stationId: null })
        .where("stationId = :id", { id })
        .execute();
    }

    await this.chargingStationRepository.remove(station);

    return {
      message: "Station deleted successfully",
      unlinkedChargers: chargerCount,
    };
  }

  async getServiceStationApplications(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const query = this.serviceStationApplicationRepository
      .createQueryBuilder("station")
      .leftJoinAndSelect("station.user", "owner")
      .orderBy("station.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        "(station.stationName ILIKE :search OR station.address ILIKE :search OR owner.name ILIKE :search OR owner.phoneNumber ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (statuses.length > 0) {
        query.andWhere("LOWER(station.applicationStatus) IN (:...statuses)", {
          statuses,
        });
      }
    }

    const [stations, total] = await query.getManyAndCount();
    const approvedStations = await this.serviceStationRepository.find({
      where: { applicationId: In(stations.map((s) => s.id)) },
    });
    const approvedByApplicationId = new Map(
      approvedStations
        .filter((row) => row.applicationId)
        .map((row) => [row.applicationId as string, row]),
    );

    return {
      applications: stations.map((station) => ({
        id: station.id,
        stationName: station.stationName,
        city: station.city,
        address: station.address,
        status: station.applicationStatus || "pending",
        verified: station.applicationStatus === "approved",
        reviewNotes: station.reviewNotes,
        reviewedBy: station.reviewedBy,
        reviewedAt: station.reviewedAt,
        createdAt: station.createdAt,
        updatedAt: station.updatedAt,
        approvedStationId: approvedByApplicationId.get(station.id)?.id ?? null,
        owner: station.user
          ? {
              id: station.user.id,
              name: station.user.name,
              phone: station.user.phoneNumber,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getServiceStationApplicationById(id: string) {
    const station = await this.serviceStationApplicationRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!station) {
      throw new NotFoundException("Service station application not found");
    }

    const approvedStation = await this.serviceStationRepository.findOne({
      where: { applicationId: station.id },
    });

    return {
      id: station.id,
      stationName: station.stationName,
      city: station.city,
      address: station.address,
      locationUrl: station.locationUrl,
      description: station.description,
      amenities: station.amenities,
      serviceCategories: station.serviceCategories,
      images: station.images,
      phoneNumber: station.phoneNumber,
      openingHours: station.openingHours,
      status: station.applicationStatus || "pending",
      verified: station.applicationStatus === "approved",
      reviewNotes: station.reviewNotes,
      reviewedBy: station.reviewedBy,
      reviewedAt: station.reviewedAt,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
      approvedStationId: approvedStation?.id ?? null,
      owner: station.user
        ? {
            id: station.user.id,
            name: station.user.name,
            phone: station.user.phoneNumber,
          }
        : null,
    };
  }

  async approveServiceStationApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    const station = await this.serviceStationApplicationRepository.findOne({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Service station application not found");
    }

    if ((station.applicationStatus || "pending") !== "pending") {
      throw new BadRequestException(
        "Only pending service station applications can be approved",
      );
    }

    station.applicationStatus = "approved";
    station.reviewNotes = reviewNotes || null;
    station.reviewedBy = reviewedBy;
    station.reviewedAt = new Date();

    await this.serviceStationApplicationRepository.save(station);

    let approvedStation = await this.serviceStationRepository.findOne({
      where: { applicationId: station.id },
    });

    if (!approvedStation) {
      approvedStation = this.serviceStationRepository.create({
        ownerId: station.userId,
        applicationId: station.id,
        stationName: station.stationName,
        locationUrl: station.locationUrl,
        lat: station.lat,
        lng: station.lng,
        address: station.address,
        city: station.city,
        phoneNumber: station.phoneNumber,
        description: station.description,
        serviceCategories: station.serviceCategories ?? [],
        amenities: station.amenities ?? [],
        openingHours: station.openingHours,
        images: station.images ?? [],
        verified: true,
        isBanned: false,
      });
    } else {
      approvedStation.stationName = station.stationName;
      approvedStation.locationUrl = station.locationUrl;
      approvedStation.lat = station.lat;
      approvedStation.lng = station.lng;
      approvedStation.address = station.address;
      approvedStation.city = station.city;
      approvedStation.phoneNumber = station.phoneNumber;
      approvedStation.description = station.description;
      approvedStation.serviceCategories = station.serviceCategories ?? [];
      approvedStation.amenities = station.amenities ?? [];
      approvedStation.openingHours = station.openingHours;
      approvedStation.images = station.images ?? [];
      approvedStation.verified = true;
      approvedStation.isBanned = false;
    }

    await this.serviceStationRepository.save(approvedStation);

    return { message: "Service station application approved successfully" };
  }

  async rejectServiceStationApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    const station = await this.serviceStationApplicationRepository.findOne({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Service station application not found");
    }

    if ((station.applicationStatus || "pending") !== "pending") {
      throw new BadRequestException(
        "Only pending service station applications can be rejected",
      );
    }

    station.applicationStatus = "rejected";
    station.reviewNotes = reviewNotes || null;
    station.reviewedBy = reviewedBy;
    station.reviewedAt = new Date();

    await this.serviceStationApplicationRepository.save(station);

    const approvedStation = await this.serviceStationRepository.findOne({
      where: { applicationId: station.id },
    });
    if (approvedStation) {
      approvedStation.verified = false;
      approvedStation.isBanned = true;
      await this.serviceStationRepository.save(approvedStation);
    }

    return { message: "Service station application rejected successfully" };
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
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.user", "user")
      .leftJoinAndSelect("booking.charger", "charger");

    if (status) {
      const statuses = status.split(",");
      queryBuilder.where("booking.status IN (:...statuses)", { statuses });
    }

    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        queryBuilder.andWhere("booking.createdAt >= :startDate", {
          startDate: start,
        });
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere("booking.createdAt <= :endDate", {
          endDate: end,
        });
      }
    }

    const [bookings, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("booking.createdAt", "DESC")
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
              city:
                b.charger.city || b.charger.address?.split(",").pop()?.trim(),
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
      relations: ["user", "charger"],
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
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
            city:
              booking.charger.city ||
              booking.charger.address?.split(",").pop()?.trim(),
          }
        : null,
      createdAt: booking.createdAt,
    };
  }

  async getBookingTimeline(id: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ["user", "charger"],
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Build timeline events based on booking data
    const timeline: Array<{
      time: string;
      event: string;
      status: "completed" | "pending" | "cancelled";
      details?: string;
    }> = [];

    // Booking created
    timeline.push({
      time: booking.createdAt.toISOString(),
      event: "Booking Created",
      status: "completed",
      details: `Booking created by ${booking.user?.name || "User"}`,
    });

    // Charging started
    if (booking.startTime) {
      timeline.push({
        time: booking.startTime.toISOString(),
        event: "Charging Started",
        status: "completed",
        details: `Started charging at ${booking.charger?.name || "charger"}`,
      });

      // Calculate charging progress events based on energy consumed
      if (booking.energyConsumed && booking.status === "completed") {
        const startTime = new Date(booking.startTime).getTime();
        const endTime = booking.endTime
          ? new Date(booking.endTime).getTime()
          : Date.now();
        const duration = endTime - startTime;

        // 25% charged
        timeline.push({
          time: new Date(startTime + duration * 0.25).toISOString(),
          event: "25% Charged",
          status: "completed",
          details: `${Math.round(booking.energyConsumed * 0.25 * 100) / 100} kWh delivered`,
        });

        // 50% charged
        timeline.push({
          time: new Date(startTime + duration * 0.5).toISOString(),
          event: "50% Charged",
          status: "completed",
          details: `${Math.round(booking.energyConsumed * 0.5 * 100) / 100} kWh delivered`,
        });

        // 75% charged
        timeline.push({
          time: new Date(startTime + duration * 0.75).toISOString(),
          event: "75% Charged",
          status: "completed",
          details: `${Math.round(booking.energyConsumed * 0.75 * 100) / 100} kWh delivered`,
        });
      }
    }

    // Charging completed or cancelled
    if (booking.endTime && booking.status === "completed") {
      timeline.push({
        time: booking.endTime.toISOString(),
        event: "Charging Completed",
        status: "completed",
        details: `Total energy: ${booking.energyConsumed} kWh, Cost: $${booking.price}`,
      });
    } else if (booking.status === "cancelled") {
      timeline.push({
        time: (booking.updatedAt || booking.createdAt).toISOString(),
        event: "Booking Cancelled",
        status: "cancelled",
        details: "Booking was cancelled",
      });
    } else if (booking.status === "active") {
      timeline.push({
        time: new Date().toISOString(),
        event: "Charging In Progress",
        status: "pending",
        details: "Charging is currently ongoing",
      });
    }

    // Generate energy consumption data if charging completed
    const energyData: Array<{ time: string; power: number; energy: number }> =
      [];

    if (
      booking.startTime &&
      booking.energyConsumed &&
      booking.status === "completed"
    ) {
      const startTime = new Date(booking.startTime).getTime();
      const endTime = booking.endTime
        ? new Date(booking.endTime).getTime()
        : Date.now();
      const duration = (endTime - startTime) / (1000 * 60); // Duration in minutes
      const dataPoints = Math.min(20, Math.floor(duration / 5)); // Sample every 5 minutes or 20 points max

      for (let i = 0; i <= dataPoints; i++) {
        const progress = i / dataPoints;
        const timeOffset = Math.floor(progress * duration);

        // Simulate realistic power curve (starts high, tapers off near end)
        const basePower = booking.charger?.powerKw || 50;
        const powerVariation =
          progress < 0.8
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
      timeline: timeline.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      ),
      energyData,
      summary: {
        totalEnergy: booking.energyConsumed || 0,
        totalCost: booking.price || 0,
        duration:
          booking.startTime && booking.endTime
            ? Math.round(
                (new Date(booking.endTime).getTime() -
                  new Date(booking.startTime).getTime()) /
                  (1000 * 60),
              )
            : 0,
        averagePower:
          booking.energyConsumed && booking.startTime && booking.endTime
            ? Math.round(
                (booking.energyConsumed /
                  ((new Date(booking.endTime).getTime() -
                    new Date(booking.startTime).getTime()) /
                    (1000 * 60 * 60))) *
                  10,
              ) / 10
            : 0,
      },
    };
  }

  async approveBooking(id: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    // Only allow approving bookings that are currently pending
    if (booking.status !== "pending") {
      throw new BadRequestException("Only pending bookings can be approved");
    }

    booking.status = "active";
    await this.bookingRepository.save(booking);

    return this.getBookingById(id);
  }

  async cancelBooking(id: string, reason?: string) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    // Prevent cancelling already completed or cancelled bookings
    if (booking.status === "completed" || booking.status === "cancelled") {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status} booking`,
      );
    }

    booking.status = "cancelled";
    await this.bookingRepository.save(booking);

    return this.getBookingById(id);
  }

  // Payout Management
  async getPendingBookingPayoutQueue(params: {
    page: number;
    limit: number;
    ownerId?: string;
    search?: string;
  }) {
    const { page, limit, ownerId, search } = params;
    const skip = (page - 1) * limit;

    const eligibleOwnerRows = await this.paymentAccountRepository
      .createQueryBuilder("account")
      .select("DISTINCT account.userId", "ownerId")
      .where("account.isActive = true")
      .andWhere("account.isPrimary = true")
      .andWhere("account.verificationStatus = :verificationStatus", {
        verificationStatus: VerificationStatus.VERIFIED,
      })
      .getRawMany();

    const eligibleOwnerSet = new Set(
      eligibleOwnerRows.map((row) => row.ownerId as string).filter(Boolean),
    );

    const primaryAccounts = await this.paymentAccountRepository
      .createQueryBuilder("account")
      .select("account.userId", "ownerId")
      .addSelect("account.accountHolderName", "accountHolderName")
      .addSelect("account.bankName", "bankName")
      .addSelect("account.accountNumber", "accountNumber")
      .addSelect("account.accountType", "accountType")
      .addSelect("account.verificationStatus", "verificationStatus")
      .where("account.isActive = true")
      .andWhere("account.isPrimary = true")
      .getRawMany();

    const primaryAccountByOwner = new Map<
      string,
      {
        accountHolderName: string;
        bankName: string;
        accountNumber: string;
        accountType: string;
        verificationStatus: string;
      }
    >();

    for (const row of primaryAccounts) {
      const ownerKey = row.ownerId as string;
      if (!ownerKey || primaryAccountByOwner.has(ownerKey)) continue;
      primaryAccountByOwner.set(ownerKey, {
        accountHolderName: row.accountHolderName,
        bankName: row.bankName,
        accountNumber: row.accountNumber,
        accountType: row.accountType,
        verificationStatus: row.verificationStatus,
      });
    }

    const qb = this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin(BookingEntity, "booking", "booking.id = payment.bookingId")
      .innerJoin(Charger, "charger", "charger.id = booking.chargerId")
      .leftJoin(UserEntity, "owner", "owner.id = charger.ownerId")
      .leftJoin(UserEntity, "bookingUser", "bookingUser.id = booking.userId")
      .where("payment.status = 'succeeded'")
      .andWhere(
        "(payment.payoutStatus IS NULL OR payment.payoutStatus = 'unsettled')",
      )
      .select("payment.id", "paymentId")
      .addSelect("payment.bookingId", "bookingId")
      .addSelect("payment.createdAt", "paymentCreatedAt")
      .addSelect("payment.status", "paymentStatus")
      .addSelect("payment.amount", "amount")
      .addSelect("payment.ownerRevenue", "ownerRevenue")
      .addSelect("payment.payoutStatus", "payoutStatus")
      .addSelect("booking.createdAt", "bookingCreatedAt")
      .addSelect("booking.updatedAt", "bookingUpdatedAt")
      .addSelect("booking.startTime", "startTime")
      .addSelect("booking.endTime", "endTime")
      .addSelect("booking.status", "bookingStatus")
      .addSelect("booking.paymentStatus", "bookingPaymentStatus")
      .addSelect("booking.cancelledAt", "bookingCancelledAt")
      .addSelect("booking.cancelReason", "bookingCancelReason")
      .addSelect("charger.id", "chargerId")
      .addSelect("charger.name", "chargerName")
      .addSelect("charger.ownerId", "ownerId")
      .addSelect("owner.name", "ownerName")
      .addSelect("owner.phoneNumber", "ownerPhone")
      .addSelect("bookingUser.id", "userId")
      .addSelect("bookingUser.name", "userName")
      .addSelect("bookingUser.phoneNumber", "userPhone")
      .orderBy("owner.name", "ASC")
      .addOrderBy("payment.createdAt", "ASC");

    if (ownerId) {
      qb.andWhere("charger.ownerId = :ownerId", { ownerId });
    }

    if (search && search.trim()) {
      qb.andWhere(
        "(owner.name ILIKE :search OR owner.phoneNumber ILIKE :search OR booking.id::text ILIKE :search OR payment.id::text ILIKE :search OR charger.name ILIKE :search)",
        { search: `%${search.trim()}%` },
      );
    }

    const countQb = qb.clone();
    const total = await countQb.getCount();

    const rows = await qb.skip(skip).take(limit).getRawMany();

    const items = rows.map((row) => {
      const ownerRevenue = Number(
        row.ownerRevenue ?? Number(row.amount || 0) * 0.94,
      );
      const ownerIdValue = row.ownerId as string;
      const hasVerifiedPrimaryAccount = eligibleOwnerSet.has(ownerIdValue);
      const ownerPrimaryAccount = primaryAccountByOwner.get(ownerIdValue);
      const accountNumber = ownerPrimaryAccount?.accountNumber || null;

      return {
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        paymentCreatedAt: row.paymentCreatedAt,
        paymentStatus: row.paymentStatus,
        bookingCreatedAt: row.bookingCreatedAt,
        bookingUpdatedAt: row.bookingUpdatedAt,
        ownerId: ownerIdValue,
        ownerName: row.ownerName || "Unknown owner",
        ownerPhone: row.ownerPhone || null,
        userId: row.userId,
        userName: row.userName || "Unknown user",
        userPhone: row.userPhone || null,
        chargerId: row.chargerId,
        chargerName: row.chargerName || "Unknown charger",
        startTime: row.startTime,
        endTime: row.endTime,
        bookingStatus: row.bookingStatus,
        bookingPaymentStatus: row.bookingPaymentStatus || null,
        bookingCancelledAt: row.bookingCancelledAt || null,
        bookingCancelReason: row.bookingCancelReason || null,
        grossPaymentAmount: Number(row.amount || 0),
        ownerRevenue: Number(ownerRevenue.toFixed(2)),
        payoutStatus: row.payoutStatus || "unsettled",
        hasVerifiedPrimaryAccount,
        ownerPrimaryBankDetails: ownerPrimaryAccount
          ? {
              accountHolderName: ownerPrimaryAccount.accountHolderName,
              bankName: ownerPrimaryAccount.bankName,
              accountType: ownerPrimaryAccount.accountType,
              accountNumber,
              verificationStatus: ownerPrimaryAccount.verificationStatus,
            }
          : null,
        processingState: hasVerifiedPrimaryAccount
          ? "ready_for_admin_processing"
          : "blocked_missing_verified_primary_account",
      };
    });

    const ownerMap = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        ownerPhone: string | null;
        bookingCount: number;
        totalOwnerRevenue: number;
        readyForProcessing: boolean;
      }
    >();

    for (const item of items) {
      const existing = ownerMap.get(item.ownerId) || {
        ownerId: item.ownerId,
        ownerName: item.ownerName,
        ownerPhone: item.ownerPhone,
        bookingCount: 0,
        totalOwnerRevenue: 0,
        readyForProcessing: item.hasVerifiedPrimaryAccount,
      };
      existing.bookingCount += 1;
      existing.totalOwnerRevenue += item.ownerRevenue;
      existing.readyForProcessing =
        existing.readyForProcessing && item.hasVerifiedPrimaryAccount;
      ownerMap.set(item.ownerId, existing);
    }

    return {
      items,
      ownerGroups: Array.from(ownerMap.values()).map((group) => ({
        ...group,
        totalOwnerRevenue: Number(group.totalOwnerRevenue.toFixed(2)),
      })),
      totals: {
        bookingCount: items.length,
        totalOwnerRevenue: Number(
          items.reduce((sum, item) => sum + item.ownerRevenue, 0).toFixed(2),
        ),
        readyCount: items.filter((item) => item.hasVerifiedPrimaryAccount)
          .length,
        blockedCount: items.filter((item) => !item.hasVerifiedPrimaryAccount)
          .length,
      },
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPayoutSummary() {
    const unsettled = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin(BookingEntity, "booking", "booking.id = payment.bookingId")
      .innerJoin(Charger, "charger", "charger.id = booking.chargerId")
      .select(
        "COALESCE(SUM(COALESCE(payment.ownerRevenue, payment.amount * 0.94)), 0)",
        "amount",
      )
      .addSelect("COUNT(payment.id)", "count")
      .addSelect("COUNT(DISTINCT charger.ownerId)", "owners")
      .where("payment.status = 'succeeded'")
      .andWhere(
        "(payment.payoutStatus IS NULL OR payment.payoutStatus = 'unsettled')",
      )
      .getRawOne();

    const inProgress = await this.ownerPayoutRepository
      .createQueryBuilder("payout")
      .select("COALESCE(SUM(payout.netPayoutAmount), 0)", "amount")
      .addSelect("COUNT(payout.id)", "count")
      .where("payout.status IN (:...statuses)", {
        statuses: [OwnerPayoutStatus.APPROVED, OwnerPayoutStatus.PROCESSING],
      })
      .getRawOne();

    const paidThisMonth = await this.ownerPayoutRepository
      .createQueryBuilder("payout")
      .select("COALESCE(SUM(payout.netPayoutAmount), 0)", "amount")
      .addSelect("COUNT(payout.id)", "count")
      .where("payout.status = :status", { status: OwnerPayoutStatus.PAID })
      .andWhere(
        "DATE_TRUNC('month', payout.paidAt) = DATE_TRUNC('month', NOW())",
      )
      .getRawOne();

    return {
      unsettled: {
        amount: Number(unsettled?.amount || 0),
        paymentCount: Number(unsettled?.count || 0),
        ownerCount: Number(unsettled?.owners || 0),
      },
      inProgress: {
        amount: Number(inProgress?.amount || 0),
        payoutCount: Number(inProgress?.count || 0),
      },
      paidThisMonth: {
        amount: Number(paidThisMonth?.amount || 0),
        payoutCount: Number(paidThisMonth?.count || 0),
      },
    };
  }

  async getOwnerPayouts(params: {
    page: number;
    limit: number;
    status?: string;
    ownerId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const {
      page,
      limit,
      status,
      ownerId,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = params;
    const skip = (page - 1) * limit;

    const qb = this.ownerPayoutRepository
      .createQueryBuilder("payout")
      .leftJoinAndSelect("payout.owner", "owner")
      .leftJoinAndSelect("payout.createdByAdmin", "createdByAdmin")
      .leftJoinAndSelect("payout.approvedByAdmin", "approvedByAdmin")
      .loadRelationCountAndMap("payout.itemCount", "payout.items")
      .orderBy("payout.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        qb.andWhere("payout.status IN (:...statuses)", { statuses });
      }
    }

    if (ownerId) {
      qb.andWhere("payout.ownerId = :ownerId", { ownerId });
    }

    if (search && search.trim()) {
      qb.andWhere(
        "(owner.name ILIKE :search OR owner.phoneNumber ILIKE :search OR payout.id::text ILIKE :search OR payout.ownerId::text ILIKE :search)",
        { search: `%${search.trim()}%` },
      );
    }

    if (startDate) {
      qb.andWhere("payout.periodStart >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      qb.andWhere("payout.periodEnd <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    if (typeof minAmount === "number" && !Number.isNaN(minAmount)) {
      qb.andWhere("payout.netPayoutAmount >= :minAmount", { minAmount });
    }

    if (typeof maxAmount === "number" && !Number.isNaN(maxAmount)) {
      qb.andWhere("payout.netPayoutAmount <= :maxAmount", { maxAmount });
    }

    const [payouts, total] = await qb.getManyAndCount();

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        ownerId: p.ownerId,
        owner: p.owner
          ? {
              id: p.owner.id,
              name: p.owner.name,
              phone: p.owner.phoneNumber,
            }
          : null,
        createdByAdmin: p.createdByAdmin
          ? {
              id: p.createdByAdmin.id,
              name: p.createdByAdmin.name,
              phone: p.createdByAdmin.phoneNumber,
            }
          : null,
        approvedByAdmin: p.approvedByAdmin
          ? {
              id: p.approvedByAdmin.id,
              name: p.approvedByAdmin.name,
              phone: p.approvedByAdmin.phoneNumber,
            }
          : null,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        grossOwnerRevenue: Number(p.grossOwnerRevenue || 0),
        adjustments: Number(p.adjustments || 0),
        netPayoutAmount: Number(p.netPayoutAmount || 0),
        status: p.status,
        transferReference: p.transferReference,
        createdByAdminId: p.createdByAdminId,
        approvedByAdminId: p.approvedByAdminId,
        approvedAt: p.approvedAt,
        paidAt: p.paidAt,
        notes: p.notes,
        itemCount: (p as any).itemCount || 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOwnerPayoutById(id: string) {
    const payout = await this.ownerPayoutRepository.findOne({
      where: { id },
      relations: [
        "owner",
        "createdByAdmin",
        "approvedByAdmin",
        "items",
        "items.payment",
        "items.booking",
      ],
    });

    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    return {
      id: payout.id,
      ownerId: payout.ownerId,
      owner: payout.owner
        ? {
            id: payout.owner.id,
            name: payout.owner.name,
            phone: payout.owner.phoneNumber,
          }
        : null,
      createdByAdmin: payout.createdByAdmin
        ? {
            id: payout.createdByAdmin.id,
            name: payout.createdByAdmin.name,
            phone: payout.createdByAdmin.phoneNumber,
          }
        : null,
      approvedByAdmin: payout.approvedByAdmin
        ? {
            id: payout.approvedByAdmin.id,
            name: payout.approvedByAdmin.name,
            phone: payout.approvedByAdmin.phoneNumber,
          }
        : null,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      grossOwnerRevenue: Number(payout.grossOwnerRevenue || 0),
      adjustments: Number(payout.adjustments || 0),
      netPayoutAmount: Number(payout.netPayoutAmount || 0),
      status: payout.status,
      transferReference: payout.transferReference,
      createdByAdminId: payout.createdByAdminId,
      approvedByAdminId: payout.approvedByAdminId,
      approvedAt: payout.approvedAt,
      paidAt: payout.paidAt,
      notes: payout.notes,
      items: (payout.items || []).map((item) => ({
        id: item.id,
        paymentId: item.paymentId,
        bookingId: item.bookingId,
        ownerRevenueAtPaymentTime: Number(item.ownerRevenueAtPaymentTime || 0),
        includeAmount: Number(item.includeAmount || 0),
        payment: item.payment
          ? {
              id: item.payment.id,
              amount: Number(item.payment.amount || 0),
              status: item.payment.status,
              createdAt: item.payment.createdAt,
            }
          : null,
        booking: item.booking
          ? {
              id: item.booking.id,
              userId: item.booking.userId,
              chargerId: item.booking.chargerId,
              startTime: item.booking.startTime,
              endTime: item.booking.endTime,
              status: item.booking.status,
            }
          : null,
      })),
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    };
  }

  async prepareOwnerPayouts(
    adminId: string,
    dto: {
      startDate?: string;
      endDate?: string;
      ownerId?: string;
      dryRun?: boolean;
      notes?: string;
    },
  ) {
    const { startDate, endDate, ownerId, dryRun, notes } = dto;

    const eligibleOwnerRows = await this.paymentAccountRepository
      .createQueryBuilder("account")
      .select("DISTINCT account.userId", "ownerId")
      .where("account.isActive = true")
      .andWhere("account.isPrimary = true")
      .andWhere("account.verificationStatus = :verificationStatus", {
        verificationStatus: VerificationStatus.VERIFIED,
      })
      .getRawMany();

    const eligibleOwnerIds = eligibleOwnerRows
      .map((r) => r.ownerId as string)
      .filter(Boolean);
    const eligibleOwnerSet = new Set(eligibleOwnerIds);

    if (ownerId && !eligibleOwnerSet.has(ownerId)) {
      return {
        dryRun: !!dryRun,
        owners: [],
        totalOwners: 0,
        totalPayments: 0,
        totalAmount: 0,
        skippedOwners: [
          {
            ownerId,
            reason: "Owner must have an active verified primary payout account",
          },
        ],
      };
    }

    if (eligibleOwnerIds.length === 0) {
      return {
        dryRun: !!dryRun,
        owners: [],
        totalOwners: 0,
        totalPayments: 0,
        totalAmount: 0,
        skippedOwners: [],
      };
    }

    const qb = this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin(BookingEntity, "booking", "booking.id = payment.bookingId")
      .innerJoin(Charger, "charger", "charger.id = booking.chargerId")
      .where("payment.status = 'succeeded'")
      .andWhere(
        "(payment.payoutStatus IS NULL OR payment.payoutStatus = 'unsettled')",
      )
      .select("payment.id", "paymentId")
      .addSelect("payment.bookingId", "bookingId")
      .addSelect("payment.createdAt", "paymentCreatedAt")
      .addSelect("payment.ownerRevenue", "ownerRevenue")
      .addSelect("payment.amount", "amount")
      .addSelect("charger.ownerId", "ownerId")
      .andWhere("charger.ownerId IN (:...eligibleOwnerIds)", {
        eligibleOwnerIds,
      });

    if (ownerId) {
      qb.andWhere("charger.ownerId = :ownerId", { ownerId });
    }

    if (startDate) {
      qb.andWhere("payment.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere("payment.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    qb.orderBy("payment.createdAt", "ASC");
    const rows = await qb.getRawMany();

    const skippedOwnersMap = new Map<string, string>();

    const grouped = new Map<
      string,
      {
        ownerId: string;
        paymentIds: string[];
        itemRows: Array<{
          paymentId: string;
          bookingId: string;
          ownerAmount: number;
        }>;
        grossAmount: number;
        periodStart: Date | null;
        periodEnd: Date | null;
      }
    >();

    for (const row of rows) {
      const currentOwnerId = row.ownerId as string;
      if (!currentOwnerId) {
        continue;
      }

      if (!eligibleOwnerSet.has(currentOwnerId)) {
        skippedOwnersMap.set(
          currentOwnerId,
          "Owner must have an active verified primary payout account",
        );
        continue;
      }

      const existing = grouped.get(currentOwnerId) || {
        ownerId: currentOwnerId,
        paymentIds: [],
        itemRows: [],
        grossAmount: 0,
        periodStart: null,
        periodEnd: null,
      };

      const ownerAmount = Number(
        row.ownerRevenue ?? Number(row.amount || 0) * 0.94,
      );
      existing.paymentIds.push(row.paymentId);
      existing.itemRows.push({
        paymentId: row.paymentId,
        bookingId: row.bookingId,
        ownerAmount,
      });
      existing.grossAmount += ownerAmount;

      const createdAt = new Date(row.paymentCreatedAt);
      if (!existing.periodStart || createdAt < existing.periodStart) {
        existing.periodStart = createdAt;
      }
      if (!existing.periodEnd || createdAt > existing.periodEnd) {
        existing.periodEnd = createdAt;
      }

      grouped.set(currentOwnerId, existing);
    }

    const preview = Array.from(grouped.values()).map((g) => ({
      ownerId: g.ownerId,
      paymentCount: g.paymentIds.length,
      grossOwnerRevenue: Number(g.grossAmount.toFixed(2)),
      periodStart: g.periodStart,
      periodEnd: g.periodEnd,
    }));

    const skippedOwners = Array.from(skippedOwnersMap.entries()).map(
      ([ownerIdValue, reason]) => ({
        ownerId: ownerIdValue,
        reason,
      }),
    );

    if (dryRun) {
      return {
        dryRun: true,
        owners: preview,
        totalOwners: preview.length,
        totalPayments: preview.reduce((sum, p) => sum + p.paymentCount, 0),
        totalAmount: preview.reduce((sum, p) => sum + p.grossOwnerRevenue, 0),
        skippedOwners,
      };
    }

    const createdPayoutIds = await this.paymentRepository.manager.transaction(
      async (manager) => {
        const payoutRepo = manager.getRepository(OwnerPayout);
        const payoutItemRepo = manager.getRepository(OwnerPayoutItem);
        const paymentRepo = manager.getRepository(PaymentEntity);

        const resultIds: string[] = [];

        for (const group of grouped.values()) {
          if (
            !group.periodStart ||
            !group.periodEnd ||
            group.paymentIds.length === 0
          ) {
            continue;
          }

          const payout = payoutRepo.create({
            ownerId: group.ownerId,
            periodStart: group.periodStart,
            periodEnd: group.periodEnd,
            grossOwnerRevenue: Number(group.grossAmount.toFixed(2)),
            adjustments: 0,
            netPayoutAmount: Number(group.grossAmount.toFixed(2)),
            status: OwnerPayoutStatus.DRAFT,
            createdByAdminId: adminId,
            notes: notes || null,
          });
          const savedPayout = await payoutRepo.save(payout);

          const items = group.itemRows.map((r) =>
            payoutItemRepo.create({
              payoutId: savedPayout.id,
              paymentId: r.paymentId,
              bookingId: r.bookingId,
              ownerRevenueAtPaymentTime: Number(r.ownerAmount.toFixed(2)),
              includeAmount: Number(r.ownerAmount.toFixed(2)),
            }),
          );
          await payoutItemRepo.save(items);

          await paymentRepo
            .createQueryBuilder()
            .update(PaymentEntity)
            .set({ payoutStatus: "queued", payoutId: savedPayout.id })
            .where("id IN (:...ids)", { ids: group.paymentIds })
            .andWhere("(payoutStatus IS NULL OR payoutStatus = 'unsettled')")
            .execute();

          resultIds.push(savedPayout.id);
        }

        return resultIds;
      },
    );

    return {
      createdPayoutCount: createdPayoutIds.length,
      payoutIds: createdPayoutIds,
      owners: preview,
      skippedOwners,
    };
  }

  async approveOwnerPayout(id: string, adminId: string) {
    const payout = await this.ownerPayoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (payout.status !== OwnerPayoutStatus.DRAFT) {
      throw new BadRequestException("Only draft payouts can be approved");
    }

    payout.status = OwnerPayoutStatus.APPROVED;
    payout.approvedByAdminId = adminId;
    payout.approvedAt = new Date();
    await this.ownerPayoutRepository.save(payout);

    return { message: "Payout approved", payoutId: payout.id };
  }

  async markOwnerPayoutProcessing(id: string) {
    const payout = await this.ownerPayoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (payout.status !== OwnerPayoutStatus.APPROVED) {
      throw new BadRequestException(
        "Only approved payouts can be moved to processing",
      );
    }

    payout.status = OwnerPayoutStatus.PROCESSING;
    await this.ownerPayoutRepository.save(payout);
    return { message: "Payout moved to processing", payoutId: payout.id };
  }

  async markOwnerPayoutPaid(
    id: string,
    adminId: string,
    dto: { transferReference?: string; notes?: string },
  ) {
    const payout = await this.ownerPayoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (
      ![OwnerPayoutStatus.APPROVED, OwnerPayoutStatus.PROCESSING].includes(
        payout.status,
      )
    ) {
      throw new BadRequestException(
        "Only approved or processing payouts can be marked paid",
      );
    }

    await this.ownerPayoutRepository.manager.transaction(async (manager) => {
      const payoutRepo = manager.getRepository(OwnerPayout);
      const paymentRepo = manager.getRepository(PaymentEntity);

      payout.status = OwnerPayoutStatus.PAID;
      payout.paidAt = new Date();
      payout.approvedByAdminId = payout.approvedByAdminId || adminId;
      payout.transferReference =
        dto.transferReference || payout.transferReference;
      payout.notes = dto.notes || payout.notes;
      await payoutRepo.save(payout);

      await paymentRepo
        .createQueryBuilder()
        .update(PaymentEntity)
        .set({ payoutStatus: "settled" })
        .where("payoutId = :payoutId", { payoutId: id })
        .execute();
    });

    return { message: "Payout marked as paid", payoutId: payout.id };
  }

  async markOwnerPayoutFailed(id: string, dto: { notes?: string }) {
    const payout = await this.ownerPayoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (
      ![OwnerPayoutStatus.APPROVED, OwnerPayoutStatus.PROCESSING].includes(
        payout.status,
      )
    ) {
      throw new BadRequestException(
        "Only approved or processing payouts can be marked failed",
      );
    }

    await this.ownerPayoutRepository.manager.transaction(async (manager) => {
      const payoutRepo = manager.getRepository(OwnerPayout);
      const paymentRepo = manager.getRepository(PaymentEntity);

      payout.status = OwnerPayoutStatus.FAILED;
      payout.notes = dto.notes || payout.notes;
      await payoutRepo.save(payout);

      await paymentRepo
        .createQueryBuilder()
        .update(PaymentEntity)
        .set({ payoutStatus: "unsettled", payoutId: null })
        .where("payoutId = :payoutId", { payoutId: id })
        .andWhere("payoutStatus = 'queued'")
        .execute();
    });

    return { message: "Payout marked as failed", payoutId: payout.id };
  }

  async cancelOwnerPayout(id: string, dto: { notes?: string }) {
    const payout = await this.ownerPayoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    if (
      ![OwnerPayoutStatus.DRAFT, OwnerPayoutStatus.APPROVED].includes(
        payout.status,
      )
    ) {
      throw new BadRequestException(
        "Only draft or approved payouts can be cancelled",
      );
    }

    await this.ownerPayoutRepository.manager.transaction(async (manager) => {
      const payoutRepo = manager.getRepository(OwnerPayout);
      const paymentRepo = manager.getRepository(PaymentEntity);

      payout.status = OwnerPayoutStatus.CANCELLED;
      payout.notes = dto.notes || payout.notes;
      await payoutRepo.save(payout);

      await paymentRepo
        .createQueryBuilder()
        .update(PaymentEntity)
        .set({ payoutStatus: "unsettled", payoutId: null })
        .where("payoutId = :payoutId", { payoutId: id })
        .andWhere("payoutStatus = 'queued'")
        .execute();
    });

    return { message: "Payout cancelled", payoutId: payout.id };
  }

  // Mechanic Application Management
  async getMechanicApplications(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    try {
      const { page, limit, status, search } = params;
      const skip = (page - 1) * limit;

      const queryBuilder = this.mechanicApplicationRepository
        .createQueryBuilder("application")
        .leftJoinAndSelect("application.user", "user");

      if (search) {
        queryBuilder.where(
          "(application.name ILIKE :search OR application.phone ILIKE :search OR application.services::text ILIKE :search)",
          { search: `%${search}%` },
        );
      }

      if (status) {
        const statuses = status.split(",");
        queryBuilder.andWhere("application.status IN (:...statuses)", {
          statuses,
        });
      }

      const [applications, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy("application.createdAt", "DESC")
        .getManyAndCount();

      return {
        applications: applications.map((a) => {
          const services = Array.isArray(a.services)
            ? a.services
            : a.services
              ? [a.services]
              : [];
          return {
            id: a.id,
            userId: a.userId,
            fullName: a.name || "",
            phoneNumber: a.phone || "",
            skills: services.join(", "),
            yearsOfExperience: a.yearsOfExperience || 0,
            certifications: a.certifications || null,
            serviceArea: a.address || "",
            serviceLat: a.lat ? Number(a.lat) : null,
            serviceLng: a.lng ? Number(a.lng) : null,
            licenseNumber: a.licenseNumber || null,
            additionalInfo: a.description || null,
            status: a.status || "pending",
            reviewedBy: a.reviewedBy || null,
            reviewNotes: a.reviewNotes || null,
            reviewedAt: a.reviewedAt || null,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            user: a.user
              ? {
                  id: a.user.id,
                  name: a.user.name || "",
                  phone: a.user.phoneNumber || "",
                }
              : null,
          };
        }),
        total,
      };
    } catch (error) {
      console.error(
        "Error fetching mechanic applications (ORM), trying schema-safe fallback:",
        error?.message || error,
      );
      const fallback = await this.getMechanicApplicationsFallback(params);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  async getMechanicApplicationById(id: string) {
    try {
      const application = await this.mechanicApplicationRepository.findOne({
        where: { id },
        relations: ["user"],
      });

      if (!application) {
        throw new NotFoundException("Mechanic application not found");
      }

      const services = Array.isArray(application.services)
        ? application.services
        : application.services
          ? [application.services]
          : [];

      return {
        id: application.id,
        userId: application.userId,
        fullName: application.name || "",
        phoneNumber: application.phone || "",
        skills: services.join(", "),
        yearsOfExperience: application.yearsOfExperience || 0,
        certifications: application.certifications || null,
        serviceArea: application.address || "",
        serviceLat: application.lat ? Number(application.lat) : null,
        serviceLng: application.lng ? Number(application.lng) : null,
        licenseNumber: application.licenseNumber || null,
        additionalInfo: application.description || null,
        status: application.status || "pending",
        reviewedBy: application.reviewedBy || null,
        reviewNotes: application.reviewNotes || null,
        reviewedAt: application.reviewedAt || null,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        user: application.user
          ? {
              id: application.user.id,
              name: application.user.name || "",
              phone: application.user.phoneNumber || "",
            }
          : null,
      };
    } catch (error) {
      console.error(
        "Error fetching mechanic application (ORM), trying schema-safe fallback:",
        error?.message || error,
      );
      const fallback = await this.getMechanicApplicationByIdFallback(id);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  private async getMechanicApplicationsFallback(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }): Promise<{ applications: any[]; total: number } | null> {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const columnsResult: Array<{ column_name: string }> =
      await this.mechanicApplicationRepository.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'mechanic_applications'`,
      );

    const columnNames = new Set(
      columnsResult.map((column) => column.column_name),
    );
    if (columnNames.size === 0) return null;

    const toIdentifier = (column: string) =>
      /^[a-z_][a-z0-9_]*$/.test(column) ? column : `"${column}"`;

    const pick = (candidates: string[]): string | null => {
      const found = candidates.find((candidate) => columnNames.has(candidate));
      return found ? toIdentifier(found) : null;
    };

    const userIdCol = pick(["user_id", "userId"]);
    if (!userIdCol) return null;

    const nameCol = pick(["name", "full_name", "fullName"]);
    const phoneCol = pick(["phone", "phone_number", "phoneNumber"]);
    const servicesCol = pick(["services", "skills"]);
    const yearsCol = pick(["years_of_experience", "yearsOfExperience"]);
    const certCol = pick(["certifications"]);
    const addressCol = pick(["address", "service_area", "serviceArea"]);
    const latCol = pick(["lat", "service_lat", "serviceLat"]);
    const lngCol = pick(["lng", "service_lng", "serviceLng"]);
    const licenseCol = pick(["license_number", "licenseNumber"]);
    const descriptionCol = pick([
      "description",
      "additional_info",
      "additionalInfo",
    ]);
    const statusCol = pick(["status"]);
    const reviewedByCol = pick(["reviewed_by", "reviewedBy"]);
    const reviewNotesCol = pick(["review_notes", "reviewNotes"]);
    const reviewedAtCol = pick(["reviewed_at", "reviewedAt"]);
    const createdAtCol = pick(["created_at", "createdAt"]);
    const updatedAtCol = pick(["updated_at", "updatedAt"]);

    const whereParts: string[] = [];
    const values: any[] = [];

    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      values.push(searchTerm);
      const p = `$${values.length}`;
      const searchParts: string[] = [];
      if (nameCol)
        searchParts.push(`CAST(application.${nameCol} AS TEXT) ILIKE ${p}`);
      if (phoneCol)
        searchParts.push(`CAST(application.${phoneCol} AS TEXT) ILIKE ${p}`);
      if (servicesCol)
        searchParts.push(`CAST(application.${servicesCol} AS TEXT) ILIKE ${p}`);
      if (searchParts.length > 0) {
        whereParts.push(`(${searchParts.join(" OR ")})`);
      }
    }

    if (status?.trim()) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length > 0 && statusCol) {
        const placeholders: string[] = [];
        for (const s of statuses) {
          values.push(s);
          placeholders.push(`$${values.length}`);
        }
        whereParts.push(
          `application.${statusCol} IN (${placeholders.join(", ")})`,
        );
      }
    }

    values.push(limit);
    const limitParam = `$${values.length}`;
    values.push(skip);
    const offsetParam = `$${values.length}`;

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const orderByCol = createdAtCol
      ? `application.${createdAtCol}`
      : "application.id";

    const rows: Array<Record<string, any>> =
      await this.mechanicApplicationRepository.query(
        `
        SELECT
          application.id AS "id",
          application.${userIdCol} AS "userId",
          ${nameCol ? `application.${nameCol}` : `NULL`} AS "fullName",
          ${phoneCol ? `application.${phoneCol}` : `NULL`} AS "phoneNumber",
          ${servicesCol ? `application.${servicesCol}` : `NULL`} AS "skillsRaw",
          ${yearsCol ? `application.${yearsCol}` : `NULL`} AS "yearsOfExperience",
          ${certCol ? `application.${certCol}` : `NULL`} AS "certifications",
          ${addressCol ? `application.${addressCol}` : `NULL`} AS "serviceArea",
          ${latCol ? `application.${latCol}` : `NULL`} AS "serviceLat",
          ${lngCol ? `application.${lngCol}` : `NULL`} AS "serviceLng",
          ${licenseCol ? `application.${licenseCol}` : `NULL`} AS "licenseNumber",
          ${descriptionCol ? `application.${descriptionCol}` : `NULL`} AS "additionalInfo",
          ${statusCol ? `application.${statusCol}` : `'pending'`} AS "status",
          ${reviewedByCol ? `application.${reviewedByCol}` : `NULL`} AS "reviewedBy",
          ${reviewNotesCol ? `application.${reviewNotesCol}` : `NULL`} AS "reviewNotes",
          ${reviewedAtCol ? `application.${reviewedAtCol}` : `NULL`} AS "reviewedAt",
          ${createdAtCol ? `application.${createdAtCol}` : `NULL`} AS "createdAt",
          ${updatedAtCol ? `application.${updatedAtCol}` : `NULL`} AS "updatedAt",
          "user".id AS "userRefId",
          "user".name AS "userName",
          "user".phone AS "userPhone",
          COUNT(*) OVER()::int AS "__total"
        FROM mechanic_applications application
        LEFT JOIN users "user" ON "user".id = application.${userIdCol}
        ${whereClause}
        ORDER BY ${orderByCol} DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
        values,
      );

    const applications = rows.map((row) => {
      const rawSkills = row.skillsRaw;
      const skills = Array.isArray(rawSkills)
        ? rawSkills.join(", ")
        : (rawSkills ?? "").toString();

      return {
        id: row.id,
        userId: row.userId,
        fullName: (row.fullName ?? "").toString(),
        phoneNumber: (row.phoneNumber ?? "").toString(),
        skills,
        yearsOfExperience:
          row.yearsOfExperience != null ? Number(row.yearsOfExperience) : 0,
        certifications: row.certifications ?? null,
        serviceArea: (row.serviceArea ?? "").toString(),
        serviceLat: row.serviceLat != null ? Number(row.serviceLat) : null,
        serviceLng: row.serviceLng != null ? Number(row.serviceLng) : null,
        licenseNumber: row.licenseNumber ?? null,
        additionalInfo: row.additionalInfo ?? null,
        status: (row.status ?? "pending").toString(),
        reviewedBy: row.reviewedBy ?? null,
        reviewNotes: row.reviewNotes ?? null,
        reviewedAt: row.reviewedAt ?? null,
        createdAt: row.createdAt ?? null,
        updatedAt: row.updatedAt ?? null,
        user: row.userRefId
          ? {
              id: row.userRefId,
              name: (row.userName ?? "").toString(),
              phone: (row.userPhone ?? "").toString(),
            }
          : null,
      };
    });

    const total = rows.length > 0 ? Number(rows[0].__total ?? 0) : 0;
    return { applications, total };
  }

  private async getMechanicApplicationByIdFallback(
    id: string,
  ): Promise<any | null> {
    const columnsResult: Array<{ column_name: string }> =
      await this.mechanicApplicationRepository.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'mechanic_applications'`,
      );

    const columnNames = new Set(
      columnsResult.map((column) => column.column_name),
    );
    if (columnNames.size === 0) return null;

    const toIdentifier = (column: string) =>
      /^[a-z_][a-z0-9_]*$/.test(column) ? column : `"${column}"`;

    const pick = (candidates: string[]): string | null => {
      const found = candidates.find((candidate) => columnNames.has(candidate));
      return found ? toIdentifier(found) : null;
    };

    const userIdCol = pick(["user_id", "userId"]);
    if (!userIdCol) return null;

    const nameCol = pick(["name", "full_name", "fullName"]);
    const phoneCol = pick(["phone", "phone_number", "phoneNumber"]);
    const servicesCol = pick(["services", "skills"]);
    const yearsCol = pick(["years_of_experience", "yearsOfExperience"]);
    const certCol = pick(["certifications"]);
    const addressCol = pick(["address", "service_area", "serviceArea"]);
    const latCol = pick(["lat", "service_lat", "serviceLat"]);
    const lngCol = pick(["lng", "service_lng", "serviceLng"]);
    const licenseCol = pick(["license_number", "licenseNumber"]);
    const descriptionCol = pick([
      "description",
      "additional_info",
      "additionalInfo",
    ]);
    const statusCol = pick(["status"]);
    const reviewedByCol = pick(["reviewed_by", "reviewedBy"]);
    const reviewNotesCol = pick(["review_notes", "reviewNotes"]);
    const reviewedAtCol = pick(["reviewed_at", "reviewedAt"]);
    const createdAtCol = pick(["created_at", "createdAt"]);
    const updatedAtCol = pick(["updated_at", "updatedAt"]);

    const rows: Array<Record<string, any>> =
      await this.mechanicApplicationRepository.query(
        `
        SELECT
          application.id AS "id",
          application.${userIdCol} AS "userId",
          ${nameCol ? `application.${nameCol}` : `NULL`} AS "fullName",
          ${phoneCol ? `application.${phoneCol}` : `NULL`} AS "phoneNumber",
          ${servicesCol ? `application.${servicesCol}` : `NULL`} AS "skillsRaw",
          ${yearsCol ? `application.${yearsCol}` : `NULL`} AS "yearsOfExperience",
          ${certCol ? `application.${certCol}` : `NULL`} AS "certifications",
          ${addressCol ? `application.${addressCol}` : `NULL`} AS "serviceArea",
          ${latCol ? `application.${latCol}` : `NULL`} AS "serviceLat",
          ${lngCol ? `application.${lngCol}` : `NULL`} AS "serviceLng",
          ${licenseCol ? `application.${licenseCol}` : `NULL`} AS "licenseNumber",
          ${descriptionCol ? `application.${descriptionCol}` : `NULL`} AS "additionalInfo",
          ${statusCol ? `application.${statusCol}` : `'pending'`} AS "status",
          ${reviewedByCol ? `application.${reviewedByCol}` : `NULL`} AS "reviewedBy",
          ${reviewNotesCol ? `application.${reviewNotesCol}` : `NULL`} AS "reviewNotes",
          ${reviewedAtCol ? `application.${reviewedAtCol}` : `NULL`} AS "reviewedAt",
          ${createdAtCol ? `application.${createdAtCol}` : `NULL`} AS "createdAt",
          ${updatedAtCol ? `application.${updatedAtCol}` : `NULL`} AS "updatedAt",
          "user".id AS "userRefId",
          "user".name AS "userName",
          "user".phone AS "userPhone"
        FROM mechanic_applications application
        LEFT JOIN users "user" ON "user".id = application.${userIdCol}
        WHERE application.id = $1
        LIMIT 1
      `,
        [id],
      );

    const row = rows[0];
    if (!row) return null;

    const rawSkills = row.skillsRaw;
    const skills = Array.isArray(rawSkills)
      ? rawSkills.join(", ")
      : (rawSkills ?? "").toString();

    return {
      id: row.id,
      userId: row.userId,
      fullName: (row.fullName ?? "").toString(),
      phoneNumber: (row.phoneNumber ?? "").toString(),
      skills,
      yearsOfExperience:
        row.yearsOfExperience != null ? Number(row.yearsOfExperience) : 0,
      certifications: row.certifications ?? null,
      serviceArea: (row.serviceArea ?? "").toString(),
      serviceLat: row.serviceLat != null ? Number(row.serviceLat) : null,
      serviceLng: row.serviceLng != null ? Number(row.serviceLng) : null,
      licenseNumber: row.licenseNumber ?? null,
      additionalInfo: row.additionalInfo ?? null,
      status: (row.status ?? "pending").toString(),
      reviewedBy: row.reviewedBy ?? null,
      reviewNotes: row.reviewNotes ?? null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      user: row.userRefId
        ? {
            id: row.userRefId,
            name: (row.userName ?? "").toString(),
            phone: (row.userPhone ?? "").toString(),
          }
        : null,
    };
  }

  async approveMechanicApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    try {
      const application = await this.getMechanicApplicationByIdFallback(id);

      if (!application) {
        throw new NotFoundException("Mechanic application not found");
      }

      if ((application.status ?? "").toString().toLowerCase() !== "pending") {
        throw new BadRequestException(
          "Only pending applications can be approved",
        );
      }

      const services = (application.skills ?? "")
        .toString()
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      await this.updateMechanicApplicationReviewState(
        id,
        ApplicationStatus.APPROVED,
        reviewedBy,
        reviewNotes,
      );

      const existingMechanic = await this.mechanicRepository.findOne({
        where: { userId: application.userId },
      });

      const mechanic = this.mechanicRepository.create({
        ...(existingMechanic ?? {}),
        userId: application.userId,
        name: application.fullName || "",
        specialization: services.join(", ") || "General Auto Repair",
        yearsOfExperience: application.yearsOfExperience || 0,
        rating: existingMechanic?.rating ?? 0,
        completedJobs: existingMechanic?.completedJobs ?? 0,
        available: existingMechanic?.available ?? true,
        services,
        lat:
          application.serviceLat != null ? Number(application.serviceLat) : 0,
        lng:
          application.serviceLng != null ? Number(application.serviceLng) : 0,
        phone: application.phoneNumber || "",
        licenseNumber: application.licenseNumber,
        certifications: application.certifications,
      });
      await this.mechanicRepository.save(mechanic);

      if (application.userId) {
        await this.userRepository.update(
          { id: application.userId },
          { role: "mechanic" as any },
        );
      }

      return { message: "Mechanic application approved successfully" };
    } catch (error) {
      console.error("Error approving mechanic application:", error);
      throw error;
    }
  }

  async rejectMechanicApplication(
    id: string,
    reviewNotes: string,
    reviewedBy: string,
  ) {
    try {
      const application = await this.getMechanicApplicationByIdFallback(id);

      if (!application) {
        throw new NotFoundException("Mechanic application not found");
      }

      if ((application.status ?? "").toString().toLowerCase() !== "pending") {
        throw new BadRequestException(
          "Only pending applications can be rejected",
        );
      }

      await this.updateMechanicApplicationReviewState(
        id,
        ApplicationStatus.REJECTED,
        reviewedBy,
        reviewNotes,
      );

      return { message: "Mechanic application rejected successfully" };
    } catch (error) {
      console.error("Error rejecting mechanic application:", error);
      throw error;
    }
  }

  private async updateMechanicApplicationReviewState(
    applicationId: string,
    status: ApplicationStatus,
    reviewedBy: string,
    reviewNotes: string,
  ) {
    const columnsResult: Array<{ column_name: string }> =
      await this.mechanicApplicationRepository.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'mechanic_applications'`,
      );

    const columnNames = new Set(
      columnsResult.map((column) => column.column_name),
    );
    const toIdentifier = (column: string) =>
      /^[a-z_][a-z0-9_]*$/.test(column) ? column : `"${column}"`;

    const pick = (candidates: string[]) => {
      const found = candidates.find((candidate) => columnNames.has(candidate));
      return found ? toIdentifier(found) : null;
    };

    const statusCol = pick(["status"]);
    if (!statusCol) {
      throw new BadRequestException(
        "Mechanic application status column is missing",
      );
    }

    const reviewedByCol = pick(["reviewed_by", "reviewedBy"]);
    const reviewNotesCol = pick(["review_notes", "reviewNotes"]);
    const reviewedAtCol = pick(["reviewed_at", "reviewedAt"]);

    const values: any[] = [status];
    const sets = [`${statusCol} = $1`];

    if (reviewedByCol) {
      values.push(reviewedBy);
      sets.push(`${reviewedByCol} = $${values.length}`);
    }
    if (reviewNotesCol) {
      values.push(reviewNotes);
      sets.push(`${reviewNotesCol} = $${values.length}`);
    }
    if (reviewedAtCol) {
      values.push(new Date());
      sets.push(`${reviewedAtCol} = $${values.length}`);
    }

    values.push(applicationId);
    await this.mechanicApplicationRepository.query(
      `UPDATE mechanic_applications SET ${sets.join(", ")} WHERE id = $${values.length}`,
      values,
    );
  }

  // Mechanics Management
  async getMechanics(params: {
    page: number;
    limit: number;
    search?: string;
    available?: boolean;
  }) {
    try {
      const { page, limit, search, available } = params;
      const skip = (page - 1) * limit;

      const queryBuilder = this.mechanicRepository
        .createQueryBuilder("mechanic")
        .leftJoinAndSelect("mechanic.user", "user");

      if (search) {
        queryBuilder.where(
          "(mechanic.specialization ILIKE :search OR user.name ILIKE :search)",
          { search: `%${search}%` },
        );
      }

      if (available !== undefined) {
        queryBuilder.andWhere("mechanic.available = :available", { available });
      }

      const [mechanics, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy("mechanic.createdAt", "DESC")
        .getManyAndCount();

      return {
        mechanics: mechanics.map((m) => ({
          id: m.id,
          userId: m.userId,
          specialization: m.specialization || "",
          yearsOfExperience: m.yearsOfExperience || 0,
          rating: Number(m.rating) || 0,
          completedJobs: m.completedJobs || 0,
          available: m.available || false,
          isBanned: m.isBanned || false,
          services: Array.isArray(m.services)
            ? m.services
            : m.services
              ? [m.services]
              : [],
          lat: m.lat ? Number(m.lat) : null,
          lng: m.lng ? Number(m.lng) : null,
          licenseNumber: m.licenseNumber || null,
          certifications: m.certifications || null,
          user: m.user
            ? {
                id: m.user.id,
                name: m.user.name || "",
                phone: m.user.phoneNumber || "",
              }
            : null,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        total,
      };
    } catch (error) {
      console.error("Error fetching mechanics:", error);
      throw error;
    }
  }

  async getMechanicById(id: string) {
    try {
      const mechanic = await this.mechanicRepository.findOne({
        where: { id },
        relations: ["user"],
      });

      if (!mechanic) {
        throw new NotFoundException("Mechanic not found");
      }

      return {
        id: mechanic.id,
        userId: mechanic.userId,
        specialization: mechanic.specialization || "",
        yearsOfExperience: mechanic.yearsOfExperience || 0,
        rating: Number(mechanic.rating) || 0,
        completedJobs: mechanic.completedJobs || 0,
        available: mechanic.available || false,
        isBanned: mechanic.isBanned || false,
        services: Array.isArray(mechanic.services)
          ? mechanic.services
          : mechanic.services
            ? [mechanic.services]
            : [],
        lat: mechanic.lat ? Number(mechanic.lat) : null,
        lng: mechanic.lng ? Number(mechanic.lng) : null,
        licenseNumber: mechanic.licenseNumber || null,
        certifications: mechanic.certifications || null,
        user: mechanic.user
          ? {
              id: mechanic.user.id,
              name: mechanic.user.name || "",
              phone: mechanic.user.phoneNumber || "",
              role: mechanic.user.role,
            }
          : null,
        createdAt: mechanic.createdAt,
        updatedAt: mechanic.updatedAt,
      };
    } catch (error) {
      console.error("Error fetching mechanic details:", error);
      throw error;
    }
  }

  async updateMechanic(id: string, data: Partial<MechanicEntity>) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
    }
    Object.assign(mechanic, data);
    await this.mechanicRepository.save(mechanic);
    return { message: "Mechanic updated successfully" };
  }

  async deleteMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
    }

    // Update user role back to 'user'
    if (mechanic.user) {
      mechanic.user.role = "user";
      await this.userRepository.save(mechanic.user);
    }

    await this.mechanicRepository.remove(mechanic);
    return { message: "Mechanic deleted successfully" };
  }

  async banMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
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
          title: "Mechanic Account Suspended",
          body: "Your mechanic account has been suspended by admin. You cannot accept new breakdown requests until reinstated.",
          data: { mechanicId: mechanic.id },
        },
      );
    } catch (error) {
      console.error("Failed to send mechanic ban notification:", error);
    }

    return { message: "Mechanic banned successfully" };
  }

  async unbanMechanic(id: string) {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
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
          title: "Mechanic Account Reinstated",
          body: "Your mechanic account has been reinstated by admin. You can now accept breakdown requests again.",
          data: { mechanicId: mechanic.id },
        },
      );
    } catch (error) {
      console.error("Failed to send mechanic unban notification:", error);
    }

    return { message: "Mechanic unbanned successfully" };
  }

  // Helper methods
  private generateDailyData(
    items: any[],
    start: Date,
    end: Date,
    type: string,
  ): any[] {
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const data: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const dayItems = items.filter((item) => {
        const itemDate = new Date(item.createdAt).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      if (type === "revenue") {
        data.push({
          date: dateStr,
          revenue: dayItems.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
          bookings: dayItems.length,
        });
      } else if (type === "bookings") {
        data.push({
          date: dateStr,
          bookings: dayItems.length,
          revenue: dayItems.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
        });
      } else if (type === "users") {
        const totalUsers = items.filter(
          (u) => new Date(u.createdAt) <= date,
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
    const locationMap = new Map<
      string,
      { revenue: number; bookings: number }
    >();

    for (const booking of bookings) {
      if (booking.charger?.address) {
        const city = booking.charger.address.split(",")[1]?.trim() || "Unknown";
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
      order: { createdAt: "DESC" },
    });

    return Promise.all(
      chargers.map(async (charger) => {
        const bookings = await this.bookingRepository.count({
          where: { chargerId: charger.id },
        });
        return {
          charger: charger.name || "Unnamed Charger",
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
      throw new NotFoundException("Charger not found");
    }

    charger.status = suspend ? "offline" : "available";
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
  async setChargerStatus(
    id: string,
    status: "available" | "in-use" | "offline",
    reason?: string,
  ) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException("Charger not found");
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
  async setChargerPriceOverride(
    id: string,
    pricePerKwh: number,
    reason?: string,
  ) {
    const charger = await this.chargerRepository.findOne({ where: { id } });
    if (!charger) {
      throw new NotFoundException("Charger not found");
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
      relations: ["owner"],
    });

    if (!charger) {
      throw new NotFoundException("Charger not found");
    }

    if (!charger.owner) {
      throw new NotFoundException("Charger owner not found");
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
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.images", "images");

    if (filters.status) {
      query.andWhere("listing.status = :status", { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        "(listing.title ILIKE :search OR listing.description ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy("listing.createdAt", "DESC");

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
      throw new NotFoundException("Listing not found");
    }

    listing.status = "approved";
    listing.adminNotes = adminNotes || null;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Reject marketplace listing
   */
  async rejectMarketplaceListing(id: string, reason: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    listing.status = "rejected";
    listing.adminNotes = reason;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Edit marketplace listing
   */
  async editMarketplaceListing(id: string, updates: any) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException("Listing not found");
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
      relations: ["seller"],
    });
    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    listing.isBanned = true;
    listing.status = "rejected"; // Set to rejected when banned
    await this.marketplaceRepository.save(listing);

    // Send notification to seller
    try {
      await this.notificationsService.sendToUser(
        listing.sellerId,
        NotificationType.LISTING_REJECTED,
        {
          title: "Listing Suspended",
          body: `Your marketplace listing "${listing.title}" has been suspended by admin and is no longer visible.`,
          data: { listingId: listing.id },
        },
      );
    } catch (error) {
      console.error("Failed to send listing ban notification:", error);
    }

    return { message: "Listing banned successfully" };
  }

  /**
   * Unban marketplace listing
   */
  async unbanMarketplaceListing(id: string) {
    const listing = await this.marketplaceRepository.findOne({
      where: { id },
      relations: ["seller"],
    });
    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    listing.isBanned = false;
    listing.status = "approved"; // Set back to approved when unbanned
    await this.marketplaceRepository.save(listing);

    // Send notification to seller
    try {
      await this.notificationsService.sendToUser(
        listing.sellerId,
        NotificationType.LISTING_APPROVED,
        {
          title: "Listing Reinstated",
          body: `Your marketplace listing "${listing.title}" has been reinstated by admin and is now visible again.`,
          data: { listingId: listing.id },
        },
      );
    } catch (error) {
      console.error("Failed to send listing unban notification:", error);
    }

    return { message: "Listing unbanned successfully" };
  }

  /**
   * Ban seller (prevents new listings)
   */
  async banSeller(sellerId: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException("Seller not found");
    }

    user.isBanned = true;
    await this.userRepository.save(user);

    // Ban all active listings by this seller
    const activeListings = await this.marketplaceRepository.find({
      where: {
        sellerId,
        isBanned: false,
      },
    });

    for (const listing of activeListings) {
      listing.isBanned = true;
      listing.status = "rejected";
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
          title: "Seller Account Suspended",
          body: "Your seller account has been suspended by admin. You cannot create new listings until reinstated.",
          data: { bannedListingsCount: activeListings.length.toString() },
        },
      );
    } catch (error) {
      console.error("Failed to send seller ban notification:", error);
    }

    return {
      message: "Seller banned successfully",
      bannedListingsCount: activeListings.length,
    };
  }

  /**
   * Unban seller
   */
  async unbanSeller(sellerId: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException("Seller not found");
    }

    user.isBanned = false;
    await this.userRepository.save(user);

    // Send notification
    try {
      await this.notificationsService.sendToUser(
        sellerId,
        NotificationType.LISTING_APPROVED,
        {
          title: "Seller Account Reinstated",
          body: "Your seller account has been reinstated by admin. You can now create listings again.",
          data: {},
        },
      );
    } catch (error) {
      console.error("Failed to send seller unban notification:", error);
    }

    return { message: "Seller unbanned successfully" };
  }

  /**
   * Suspend seller
   */
  async suspendSeller(sellerId: string, suspend: boolean, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!user) {
      throw new NotFoundException("Seller not found");
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
      throw new NotFoundException("Mechanic not found");
    }

    // Add admin verification status
    mechanic.available = verified;
    mechanic.description = notes
      ? `${mechanic.description || ""}\n\nAdmin Notes: ${notes}`.trim()
      : mechanic.description;

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * Suspend mechanic
   */
  async suspendMechanic(id: string, suspend: boolean, reason: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
    }

    mechanic.available = !suspend;
    mechanic.description = suspend
      ? `${mechanic.description || ""}\n\nSuspended by admin: ${reason}`.trim()
      : mechanic.description?.replace(/\n\nSuspended by admin:.*$/m, "").trim();

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
      throw new NotFoundException("Charger not found");
    }

    if (!charger.verified) {
      throw new BadRequestException("Can only hold approved/verified chargers");
    }

    const previousStatus = charger.status;
    charger.status = "offline";
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
      throw new NotFoundException("Charger not found");
    }

    if (!charger.metadata?.adminHeld) {
      throw new BadRequestException("Charger is not currently held");
    }

    const previousStatus = charger.metadata?.previousStatus || "available";
    charger.status = previousStatus;
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
      throw new NotFoundException("Listing not found");
    }

    if (listing.status !== "approved") {
      throw new BadRequestException("Can only hold approved listings");
    }

    listing.status = "pending"; // Move to pending to hide from marketplace
    listing.adminNotes = `HELD by admin: ${reason}\n\nPrevious notes: ${listing.adminNotes || "None"}`;

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Release a held marketplace listing
   */
  async releaseListing(id: string, notes?: string) {
    const listing = await this.marketplaceRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (!listing.adminNotes?.includes("HELD by admin")) {
      throw new BadRequestException("Listing is not currently held");
    }

    listing.status = "approved";
    listing.adminNotes = notes
      ? `RELEASED by admin: ${notes}\n\n${listing.adminNotes}`
      : listing.adminNotes.replace(/HELD by admin:.*?\n\n/s, "");

    return this.marketplaceRepository.save(listing);
  }

  /**
   * Hold an approved mechanic
   */
  async holdMechanic(id: string, reason: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
    }

    if (!mechanic.available) {
      throw new BadRequestException("Mechanic is not currently active");
    }

    mechanic.available = false;
    mechanic.description =
      `[HELD BY ADMIN] ${reason}\n\n${mechanic.description || ""}`.trim();

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * Release a held mechanic
   */
  async releaseMechanic(id: string, notes?: string) {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException("Mechanic not found");
    }

    if (!mechanic.description?.includes("[HELD BY ADMIN]")) {
      throw new BadRequestException("Mechanic is not currently held");
    }

    mechanic.available = true;
    mechanic.description = mechanic.description
      .replace(/\[HELD BY ADMIN\].*?\n\n/s, "")
      .trim();

    if (notes) {
      mechanic.description =
        `[RELEASED] ${notes}\n\n${mechanic.description}`.trim();
    }

    return this.mechanicRepository.save(mechanic);
  }

  // ── Admin OCPP Controls ────────────────────────────────────────────────────

  private async resolveOcppId(postgresChargerId: string): Promise<string> {
    const charger = await this.chargerRepository.findOne({
      where: { id: postgresChargerId },
    });
    if (!charger) throw new NotFoundException("Charger not found");
    if (!charger.chargeBoxIdentity) {
      throw new HttpException(
        "Charger has no OCPP identity — not yet registered with OCPP service",
        HttpStatus.BAD_REQUEST,
      );
    }
    // Resolve to ev-charging-service internal UUID
    const ocppCharger = await this.chargingService.getChargerByIdentity(
      charger.chargeBoxIdentity,
    );
    return ocppCharger.id;
  }

  async ocppResetCharger(chargerId: string, type: "Soft" | "Hard" = "Soft") {
    const ocppId = await this.resolveOcppId(chargerId);
    return this.chargingService.resetCharger(ocppId, type);
  }

  async ocppUnlockConnector(chargerId: string, connectorId = 1) {
    const ocppId = await this.resolveOcppId(chargerId);
    return this.chargingService.unlockConnector(ocppId, connectorId);
  }

  async ocppSetAvailability(
    chargerId: string,
    connectorId: number,
    type: "Operative" | "Inoperative",
  ) {
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

  // ==================== NOTIFICATIONS ====================

  async getNotificationLogs(params: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    status?: string;
  }) {
    const { page, limit, search, type, status } = params;
    const skip = (page - 1) * limit;

    const qb = this.notificationLogRepository
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .orderBy("log.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere(
        "(log.title ILIKE :search OR log.body ILIKE :search OR user.name ILIKE :search OR user.phone ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (type) {
      qb.andWhere("log.type = :type", { type });
    }

    if (status) {
      qb.andWhere("log.status = :status", { status });
    }

    const [notifications, total] = await qb.getManyAndCount();

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        userName: (n as any).user?.name || "Unknown",
        userPhone: (n as any).user?.phoneNumber || "",
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        status: n.status,
        sentAt: n.sentAt,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNotificationStats() {
    const total = await this.notificationLogRepository.count();
    const sent = await this.notificationLogRepository.count({
      where: { status: "sent" },
    });
    const read = await this.notificationLogRepository.count({
      where: { status: "read" },
    });
    const failed = await this.notificationLogRepository.count({
      where: { status: "failed" },
    });
    const pending = await this.notificationLogRepository.count({
      where: { status: "pending" },
    });

    // Recent 24h count
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.notificationLogRepository
      .createQueryBuilder("log")
      .where("log.createdAt >= :oneDayAgo", { oneDayAgo })
      .getCount();

    return { total, sent, read, failed, pending, recentCount };
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    type?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const notificationType =
      (type as NotificationType) || NotificationType.ADMIN_ANNOUNCEMENT;

    await this.notificationsService.sendToUser(userId, notificationType, {
      title,
      body,
      data: { source: "admin", type: notificationType },
    });

    return {
      success: true,
      message: `Notification sent to ${user.name || user.phoneNumber}`,
    };
  }

  async broadcastNotification(title: string, body: string) {
    const users = await this.userRepository.find({
      where: { isBanned: false },
      select: ["id"],
    });

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await this.notificationsService.sendToUser(
          user.id,
          NotificationType.ADMIN_ANNOUNCEMENT,
          {
            title,
            body,
            data: { source: "admin_broadcast" },
          },
        );
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    return {
      success: true,
      message: `Broadcast sent to ${successCount} users (${failCount} failed)`,
      totalUsers: users.length,
      successCount,
      failCount,
    };
  }

  async deleteNotificationLog(id: string) {
    const log = await this.notificationLogRepository.findOne({
      where: { id },
    });
    if (!log) {
      throw new NotFoundException(`Notification log ${id} not found`);
    }
    await this.notificationLogRepository.remove(log);
    return { success: true, message: "Notification log deleted" };
  }
}
