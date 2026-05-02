import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UserEntity } from "../users/entities/user.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { OtpService } from "./otp.service";
import { SmsService } from "./sms.service";
import { Charger } from "../charger/entities/charger.entity";
import { MechanicEntity } from "../mechanics/entities/mechanic.entity";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async updateUserProfile(
    userId: string,
    data: Partial<{
      name: string;
      phoneNumber: string;
      countryCode: string;
      gender: string;
    }>,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    if (data.name) user.name = data.name;
    if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
    if (data.countryCode) user.countryCode = data.countryCode;
    if (data.gender) {
      const normalizedGender = data.gender.toLowerCase();
      if (normalizedGender !== "male" && normalizedGender !== "female") {
        throw new BadRequestException("Gender must be male or female");
      }
      user.gender = normalizedGender;
    }
    await this.userRepository.save(user);
    return user;
  }
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private otpService: OtpService,
    private smsService: SmsService,
    private configService: ConfigService,
  ) {}

  // ==================== TOKEN HELPERS ====================

  private generateAccessToken(user: UserEntity): string {
    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      tokenVersion,
      type: "access",
    };
    return this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>("JWT_EXPIRES_IN") ||
        "24h") as any,
    });
  }

  private generateRefreshToken(user: UserEntity): string {
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret)
      throw new Error("JWT_REFRESH_SECRET environment variable is not set");
    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      sub: user.id,
      tokenVersion,
      type: "refresh",
    };
    return this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ||
        "30d") as any,
    });
  }

  private async buildUserResponse(user: UserEntity) {
    const chargerCount = await this.chargerRepository.count({
      where: { ownerId: user.id },
    });
    const mechanicProfile = await this.mechanicRepository.findOne({
      where: { userId: user.id },
    });
    const hasChargers = chargerCount > 0;
    const hasMechanicProfile = mechanicProfile !== null;
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber,
      name: user.name,
      gender: user.gender,
      role: user.role,
      countryCode: user.countryCode,
      isVerified: user.isVerified,
      isOwner: user.role === "owner" || user.role === "admin" || hasChargers,
      isMechanic:
        user.role === "mechanic" || hasMechanicProfile || user.role === "admin",
      isAdmin: user.role === "admin",
    };
  }

  async register(registerDto: RegisterDto) {
    const { phoneNumber, password, name, gender } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { phoneNumber },
    });
    if (existingUser) {
      throw new ConflictException("Phone number already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      phoneNumber,
      password: hashedPassword,
      name,
      gender,
    });

    await this.userRepository.save(user);

    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
      user: await this.buildUserResponse(user),
    };
  }

  async login(loginDto: LoginDto) {
    try {
      const { phoneNumber, password } = loginDto;
      console.log("[AUTH SERVICE] Login attempt for phoneNumber:", phoneNumber);

      const user = await this.userRepository.findOne({
        where: { phoneNumber },
      });
      console.log(
        "[AUTH SERVICE] User found:",
        user ? `YES (ID: ${user.id})` : "NO",
      );

      if (!user) throw new UnauthorizedException("Invalid credentials");

      if (user.isBanned)
        throw new UnauthorizedException("Your account has been banned");

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("[AUTH SERVICE] Password valid:", isPasswordValid);
      if (!isPasswordValid)
        throw new UnauthorizedException("Invalid credentials");

      console.log("[AUTH SERVICE] Login successful for:", phoneNumber);
      return {
        access_token: this.generateAccessToken(user),
        refresh_token: this.generateRefreshToken(user),
        user: await this.buildUserResponse(user),
      };
    } catch (error) {
      console.error("[AUTH SERVICE] Login error:", error.message, error.stack);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async adminLogin(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    console.log("Admin login attempt:", { phoneNumber, userFound: !!user });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    console.log("User details:", {
      id: user.id,
      role: user.role,
      hasPassword: !!user.password,
    });

    if (user.role !== "admin")
      throw new UnauthorizedException("Access denied. Admin role required.");
    if (user.isBanned)
      throw new UnauthorizedException("Your account has been banned");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password validation:", { isPasswordValid });
    if (!isPasswordValid)
      throw new UnauthorizedException("Invalid credentials");

    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
      user: await this.buildUserResponse(user),
    };
  }

  async refreshToken(refreshTokenStr: string) {
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret) throw new Error("JWT_REFRESH_SECRET is not set");

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshTokenStr, {
        secret: refreshSecret,
      });
    } catch (e) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException("User not found");
    if (user.isBanned)
      throw new UnauthorizedException("User account is banned");

    // Validate token version when supported by the current DB schema.
    // Some deployments may not yet have tokenVersion column.
    if (
      typeof user.tokenVersion === "number" &&
      typeof payload.tokenVersion === "number" &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      throw new UnauthorizedException(
        "Refresh token has been invalidated. Please login again.",
      );
    }

    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
    };
  }

  async logout(userId: string) {
    // Increment tokenVersion to invalidate all existing access + refresh tokens
    // when tokenVersion exists in this deployment.
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (typeof user.tokenVersion === "number") {
      await this.userRepository.increment({ id: userId }, "tokenVersion", 1);
    }

    return { success: true, message: "Logged out successfully" };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: "Password changed successfully" };
  }

  async deleteAccount(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const phoneNumber = user.phoneNumber;
    const userName = user.name;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete all related data in the correct order to avoid foreign key constraints
      // Dependency chain: payments → bookings → chargers
      
      // 1. Delete wallet transactions and charging sessions (wallet module)
      await queryRunner.manager.delete("wallet_transactions", { userId });
      await queryRunner.manager.delete("wallet_charging_sessions", { userId });
      await queryRunner.manager.delete("wallets", { userId });

      // 2. Delete payments (via booking relationship - payments.bookingId -> bookings)
      // Get all booking IDs for this user
      const userBookings = await queryRunner.manager.find("bookings", {
        where: { userId },
      });
      const bookingIds = userBookings.map((booking: any) => booking.id);

      if (bookingIds.length > 0) {
        const userPayments = await queryRunner.manager.find("payments", {
          where: { bookingId: In(bookingIds) },
        });
        const paymentIds = userPayments.map((payment: any) => payment.id);

        if (paymentIds.length > 0) {
          await queryRunner.manager.delete("owner_payout_items", {
            paymentId: In(paymentIds),
          });
        }

        await queryRunner.manager.delete("payments", {
          bookingId: In(bookingIds),
        });
      }

      // 3. Delete bookings (bookings.chargerId references chargers)
      await queryRunner.manager.delete("bookings", { userId });

      // 4. Delete chargers (owned by user)
      await queryRunner.manager.delete("chargers", { ownerId: userId });

      // 5. Delete marketplace listings and reviews
      await queryRunner.manager.delete("marketplace_listings", { sellerId: userId });
      await queryRunner.manager.delete("charger_reviews", { userId });

      // 6. Delete vehicle profiles and favorites
      await queryRunner.manager.delete("vehicle_profiles", { userId });
      await queryRunner.manager.delete("favorite_chargers", { userId });

      // 7. Delete remaining payment records
      await queryRunner.manager.delete("payment_methods", { userId });
      await queryRunner.manager.delete("user_payment_settings", { userId });

      // 8. Delete notifications
      await queryRunner.manager.delete("notification_logs", { userId });
      await queryRunner.manager.delete("fcm_tokens", { userId });

      // 9. Delete mechanic-related records
      await queryRunner.manager.delete("mechanic_applications", { userId });

      const emergencyRequests = await queryRunner.manager.find(
        "emergency_requests",
        {
          where: { userId },
        },
      );
      const emergencyRequestIds = emergencyRequests.map(
        (request: any) => request.id,
      );

      if (emergencyRequestIds.length > 0) {
        await queryRunner.manager.delete("mechanic_responses", {
          emergencyRequestId: In(emergencyRequestIds),
        });
        await queryRunner.manager.delete("emergency_requests", {
          id: In(emergencyRequestIds),
        });
      }

      const userMechanics = await queryRunner.manager.find("mechanics", {
        where: { userId },
      });
      const mechanicIds = userMechanics.map((mechanic: any) => mechanic.id);

      if (mechanicIds.length > 0) {
        await queryRunner.manager.delete("mechanic_responses", {
          mechanicId: In(mechanicIds),
        });
        await queryRunner.manager.delete("mechanic_analytics", {
          mechanicId: In(mechanicIds),
        });
        await queryRunner.manager.delete("mechanic_expertise", {
          mechanicId: In(mechanicIds),
        });
        await queryRunner.manager.delete("mechanics", {
          id: In(mechanicIds),
        });
      }

      // 10. Delete service provider records
      await queryRunner.manager.delete("service_station_bookings", { userId });
      await queryRunner.manager.delete("service_provider_signals", { userId });

      // 11. Delete payment accounts
      await queryRunner.manager.delete("owner_payment_accounts", { userId });

      // 12. Delete the user itself (last, after all dependents)
      await queryRunner.manager.delete("users", { id: userId });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to delete account for user ${userId}: ${(error as Error).message}`,
        error,
      );
      throw new BadRequestException(
        `Failed to delete account: ${(error as Error).message}`,
      );
    } finally {
      await queryRunner.release();
    }

    // Send SMS notification after successful deletion
    if (phoneNumber) {
      try {
        await this.smsService.sendAccountDeletedSMS(phoneNumber, userName);
      } catch (error) {
        this.logger.warn(
          `Account deleted but failed to send deletion SMS for user ${userId}: ${(error as Error).message}`,
        );
      }
    }

    return { message: "Account deleted successfully" };
  }

  // ==================== PHONE AUTHENTICATION METHODS ====================

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string) {
    // Check if phone number is already registered
    const existingUser = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException("Phone number already registered");
    }

    // Generate OTP
    const otp = this.otpService.generateOTP();

    // Store OTP in database
    await this.otpService.storeOTP(phoneNumber, otp);

    // Send OTP via SMS
    await this.smsService.sendOTP(phoneNumber, otp);

    return {
      success: true,
      message: "OTP sent successfully",
      expiresIn: 300, // 5 minutes in seconds
    };
  }

  /**
   * Verify OTP and return verification token
   */
  async verifyOTP(phoneNumber: string, otp: string) {
    // Validate OTP
    const verificationToken = await this.otpService.validateOTP(
      phoneNumber,
      otp,
    );

    return {
      success: true,
      verificationToken,
      expiresIn: 600, // 10 minutes in seconds
    };
  }

  /**
   * Register user with phone number
   */
  async registerWithPhone(
    phoneNumber: string,
    password: string,
    verificationToken: string,
    name?: string,
  ) {
    // Verify the verification token
    const tokenData = this.otpService.verifyToken(verificationToken);

    if (tokenData.phoneNumber !== phoneNumber) {
      throw new BadRequestException("Phone number mismatch");
    }

    // Check if phone number is already registered
    const existingUser = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException("Phone number already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const normalizedName = name?.trim();
    const user = this.userRepository.create({
      phoneNumber,
      password: hashedPassword,
      name:
        normalizedName && normalizedName.length > 0
          ? normalizedName
          : `User ${phoneNumber.slice(-4)}`,
      isVerified: true, // Phone is verified via OTP
    });

    await this.userRepository.save(user);

    // Send welcome SMS
    await this.smsService.sendWelcomeSMS(phoneNumber, user.name);

    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
      user: await this.buildUserResponse(user),
    };
  }

  /**
   * Login with phone number and password
   */
  async loginWithPhone(phoneNumber: string, password: string) {
    try {
      console.log(
        "[loginWithPhone] Starting login with phoneNumber:",
        phoneNumber,
      );

      // Find user by phone number
      const user = await this.userRepository.findOne({
        where: { phoneNumber },
      });

      console.log("[loginWithPhone] User found:", user ? "YES" : "NO");

      if (!user) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Check if user is banned
      if (user.isBanned) {
        throw new UnauthorizedException("Your account has been banned");
      }

      console.log("[loginWithPhone] Comparing password...");
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("[loginWithPhone] Password valid:", isPasswordValid);

      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      console.log("[loginWithPhone] Generating tokens...");
      console.log("[loginWithPhone] Login successful");
      return {
        access_token: this.generateAccessToken(user),
        refresh_token: this.generateRefreshToken(user),
        user: await this.buildUserResponse(user),
      };
    } catch (error) {
      console.error("[loginWithPhone] Error:", error.message, error.stack);
      throw error;
    }
  }

  /**
   * Send OTP for password reset
   */
  async sendPasswordResetOTP(phoneNumber: string) {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException("Phone number not registered");
    }

    // Generate OTP
    const otp = this.otpService.generateOTP();

    // Store OTP in database
    await this.otpService.storeOTP(phoneNumber, otp);

    // Send OTP via SMS
    await this.smsService.sendOTP(phoneNumber, otp);

    return {
      success: true,
      message: "Password reset OTP sent successfully",
      expiresIn: 300, // 5 minutes in seconds
    };
  }

  /**
   * Reset password with OTP verification
   */
  async resetPassword(
    phoneNumber: string,
    newPassword: string,
    verificationToken: string,
  ) {
    // Verify the verification token
    const tokenData = this.otpService.verifyToken(verificationToken);

    if (tokenData.phoneNumber !== phoneNumber) {
      throw new BadRequestException("Phone number mismatch");
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return {
      success: true,
      message: "Password reset successfully",
    };
  }
}
