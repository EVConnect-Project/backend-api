import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { Charger } from '../charger/entities/charger.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Injectable()
export class AuthService {
    async updateUserProfile(userId: string, data: Partial<{ name: string; phoneNumber: string; countryCode: string }>) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (data.name) user.name = data.name;
      if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
      if (data.countryCode) user.countryCode = data.countryCode;
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
      type: 'access',
    };
    return this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '24h') as any,
    });
  }

  private generateRefreshToken(user: UserEntity): string {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      sub: user.id,
      tokenVersion,
      type: 'refresh',
    };
    return this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d') as any,
    });
  }

  private async buildUserResponse(user: UserEntity) {
    const chargerCount = await this.chargerRepository.count({ where: { ownerId: user.id } });
    const mechanicProfile = await this.mechanicRepository.findOne({ where: { userId: user.id } });
    const hasChargers = chargerCount > 0;
    const hasMechanicProfile = mechanicProfile !== null;
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber,
      name: user.name,
      role: user.role,
      countryCode: user.countryCode,
      isVerified: user.isVerified,
      isOwner: user.role === 'owner' || user.role === 'admin' || hasChargers,
      isMechanic: user.role === 'mechanic' || hasMechanicProfile || user.role === 'admin',
      isAdmin: user.role === 'admin',
    };
  }

  async register(registerDto: RegisterDto) {
    const { phoneNumber, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { phoneNumber } });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      phoneNumber,
      password: hashedPassword,
      name,
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
      console.log('[AUTH SERVICE] Login attempt for phoneNumber:', phoneNumber);

      const user = await this.userRepository.findOne({ where: { phoneNumber } });
      console.log('[AUTH SERVICE] User found:', user ? `YES (ID: ${user.id})` : 'NO');

      if (!user) throw new UnauthorizedException('Invalid credentials');

      if (user.isBanned) throw new UnauthorizedException('Your account has been banned');

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[AUTH SERVICE] Password valid:', isPasswordValid);
      if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

      console.log('[AUTH SERVICE] Login successful for:', phoneNumber);
      return {
        access_token: this.generateAccessToken(user),
        refresh_token: this.generateRefreshToken(user),
        user: await this.buildUserResponse(user),
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Login error:', error.message, error.stack);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async adminLogin(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    console.log('Admin login attempt:', { phoneNumber, userFound: !!user });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    console.log('User details:', { id: user.id, role: user.role, hasPassword: !!user.password });

    if (user.role !== 'admin') throw new UnauthorizedException('Access denied. Admin role required.');
    if (user.isBanned) throw new UnauthorizedException('Your account has been banned');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation:', { isPasswordValid });
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
      user: await this.buildUserResponse(user),
    };
  }

  async refreshToken(refreshTokenStr: string) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not set');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshTokenStr, { secret: refreshSecret });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isBanned) throw new UnauthorizedException('User account is banned');

    // Validate token version when supported by the current DB schema.
    // Some deployments may not yet have tokenVersion column.
    if (
      typeof user.tokenVersion === 'number' &&
      typeof payload.tokenVersion === 'number' &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      throw new UnauthorizedException('Refresh token has been invalidated. Please login again.');
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
      throw new UnauthorizedException('User not found');
    }

    if (typeof user.tokenVersion === 'number') {
      await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    }

    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.userRepository.remove(user);
    return { message: 'Account deleted successfully' };
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
      throw new ConflictException('Phone number already registered');
    }

    // Generate OTP
    const otp = this.otpService.generateOTP();

    // Store OTP in database
    await this.otpService.storeOTP(phoneNumber, otp);

    // Send OTP via SMS
    await this.smsService.sendOTP(phoneNumber, otp);

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
      ...(isDev && { otp }), // Only include OTP in development
    };
  }

  /**
   * Verify OTP and return verification token
   */
  async verifyOTP(phoneNumber: string, otp: string) {
    // Validate OTP
    const verificationToken = await this.otpService.validateOTP(phoneNumber, otp);

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
  ) {
    // Verify the verification token
    const tokenData = this.otpService.verifyToken(verificationToken);
    
    if (tokenData.phoneNumber !== phoneNumber) {
      throw new BadRequestException('Phone number mismatch');
    }

    // Check if phone number is already registered
    const existingUser = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      phoneNumber,
      password: hashedPassword,
      name: `User ${phoneNumber.slice(-4)}`, // Default name
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
      console.log('[loginWithPhone] Starting login with phoneNumber:', phoneNumber);
      
      // Find user by phone number
      const user = await this.userRepository.findOne({
        where: { phoneNumber },
      });

      console.log('[loginWithPhone] User found:', user ? 'YES' : 'NO');
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is banned
      if (user.isBanned) {
        throw new UnauthorizedException('Your account has been banned');
      }

      console.log('[loginWithPhone] Comparing password...');
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[loginWithPhone] Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[loginWithPhone] Generating tokens...');
      console.log('[loginWithPhone] Login successful');
      return {
        access_token: this.generateAccessToken(user),
        refresh_token: this.generateRefreshToken(user),
        user: await this.buildUserResponse(user),
      };
    } catch (error) {
      console.error('[loginWithPhone] Error:', error.message, error.stack);
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
      throw new UnauthorizedException('Phone number not registered');
    }

    // Generate OTP
    const otp = this.otpService.generateOTP();

    // Store OTP in database
    await this.otpService.storeOTP(phoneNumber, otp);

    // Send OTP via SMS
    await this.smsService.sendOTP(phoneNumber, otp);

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    return {
      success: true,
      message: 'Password reset OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
      ...(isDev && { otp }), // Only include OTP in development
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
      throw new BadRequestException('Phone number mismatch');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
