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
    async updateUserProfile(userId: string, data: Partial<{ name: string; email: string; phone: string; countryCode: string }>) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (data.name) user.name = data.name;
      if (data.email) user.email = data.email;
      if (data.phone) user.phone = data.phone;
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
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // If it's not an email format, convert phone to temp email format
    let searchEmail = email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // It's a phone number, convert to temp email format
      searchEmail = `${email}@temp.evconnect.com`;
    }

    // Find user by email (including phone-formatted emails)
    const user = await this.userRepository.findOne({
      where: { email: searchEmail },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async adminLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // If it's not an email format, convert phone to temp email format
    let searchEmail = email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // It's a phone number, convert to temp email format
      searchEmail = `${email}@temp.evconnect.com`;
    }

    // Find user by email (including phone-formatted emails)
    const user = await this.userRepository.findOne({
      where: { email: searchEmail },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token with role
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
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
      email: `${phoneNumber}@evrs.app`, // Temporary email
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
    // Find user by phone number
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been banned');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
