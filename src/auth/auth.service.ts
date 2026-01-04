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
    private jwtService: JwtService,
    private otpService: OtpService,
    private smsService: SmsService,
    private configService: ConfigService,
  ) {}

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

    // Generate JWT token
    const payload = { sub: user.id, phone: user.phoneNumber, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    try {
      const { phoneNumber, password } = loginDto;
      
      console.log('[AUTH SERVICE] Login attempt for phoneNumber:', phoneNumber);

      // Find user by phone number
      const user = await this.userRepository.findOne({
        where: { phoneNumber },
      });
      
      console.log('[AUTH SERVICE] User found:', user ? `YES (ID: ${user.id})` : 'NO');

      if (!user) {
        console.log('[AUTH SERVICE] User not found for:', phoneNumber);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[AUTH SERVICE] Verifying password...');
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[AUTH SERVICE] Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('[AUTH SERVICE] Invalid password for:', phoneNumber);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[AUTH SERVICE] Generating JWT token...');
      // Generate JWT token
      const payload = { sub: user.id, phone: user.phoneNumber, role: user.role };
      
      let access_token: string;
      try {
        access_token = this.jwtService.sign(payload);
        console.log('[AUTH SERVICE] JWT token generated successfully');
      } catch (jwtError) {
        console.error('[AUTH SERVICE] JWT signing error:', jwtError);
        throw new UnauthorizedException('Failed to generate authentication token');
      }
      
      console.log('[AUTH SERVICE] Login successful for:', phoneNumber);

      return {
        access_token,
        user: {
          id: user.id,
          phone: user.phoneNumber,
          name: user.name,
          role: user.role,
        },
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

    // Find user by phone number
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });
    console.log('Admin login attempt:', { phoneNumber, userFound: !!user });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('User details:', { id: user.id, role: user.role, hasPassword: !!user.password });

    // Check if user is admin
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Access denied. Admin role required.');
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been banned');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation:', { isPasswordValid });
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token with role
    const payload = { sub: user.id, phone: user.phoneNumber, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
    };
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

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
      otp, // For testing - remove in production
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

    // Generate JWT tokens
    const payload = { sub: user.id, phoneNumber: user.phoneNumber, role: user.role };
    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
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
      // Generate JWT tokens
      const payload = { sub: user.id, phoneNumber: user.phoneNumber, role: user.role };
      const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

      console.log('[loginWithPhone] Login successful');
      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
        },
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

    return {
      success: true,
      message: 'Password reset OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
      otp, // For testing - remove in production
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
