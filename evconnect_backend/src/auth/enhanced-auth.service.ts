import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../users/entities/user.entity';
import { EnhancedRegisterDto } from './dto/enhanced-register.dto';

@Injectable()
export class EnhancedAuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * Enhanced registration for EV SuperApp
   * Includes vehicle profile and legal requirements
   */
  async registerEnhanced(registerDto: EnhancedRegisterDto) {
    const {
      name,
      emailOrPhone,
      password,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      batteryCapacity,
      connectorType,
      acceptTerms,
      acceptPrivacyPolicy,
    } = registerDto;

    // Validate legal requirements
    if (!acceptTerms || !acceptPrivacyPolicy) {
      throw new BadRequestException('You must accept the terms and conditions and privacy policy');
    }

    // Determine if emailOrPhone is email or phone
    const isEmail = this.isEmail(emailOrPhone);
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;

    // Check if user already exists (by email only - phone temporarily disabled)
    const existingUser = await this.userRepository.findOne({
      where: { email: email || undefined },
    });

    if (existingUser) {
      throw new ConflictException(
        isEmail ? 'Email already registered' : 'Phone number already registered'
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with complete EV driver profile
    const user = this.userRepository.create({
      name: name,
      email: email || undefined,
      // phone: phone || undefined, // temporarily disabled
      password: hashedPassword,
      role: 'user', // Default role
      vehicleType: vehicleType,
      vehicleBrand: vehicleBrand,
      vehicleModel: vehicleModel,
      batteryCapacity: batteryCapacity,
      connectorType: connectorType,
      acceptedTerms: acceptTerms,
      acceptedPrivacyPolicy: acceptPrivacyPolicy,
      termsAcceptedAt: new Date(),
      isVerified: false, // Email/phone verification pending
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const payload = { 
      sub: user.id, 
      email: user.email, 
      // phone: user.phone, // temporarily disabled
      role: user.role 
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        // phone: user.phone, // temporarily disabled
        name: user.name,
        role: user.role,
        vehicleProfile: {
          vehicleType: user.vehicleType,
          vehicleBrand: user.vehicleBrand,
          vehicleModel: user.vehicleModel,
          batteryCapacity: user.batteryCapacity,
          connectorType: user.connectorType,
        },
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Helper method to check if input is email or phone
   */
  private isEmail(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  }

  /**
   * Get user's complete profile including vehicle information
   */
  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      // phone: user.phone, // temporarily disabled
      name: user.name,
      role: user.role,
      vehicleProfile: {
        vehicleType: user.vehicleType,
        vehicleBrand: user.vehicleBrand,
        vehicleModel: user.vehicleModel,
        batteryCapacity: user.batteryCapacity,
        connectorType: user.connectorType,
      },
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update vehicle profile
   */
  async updateVehicleProfile(userId: string, vehicleData: Partial<EnhancedRegisterDto>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update only vehicle-related fields
    if (vehicleData.vehicleType) user.vehicleType = vehicleData.vehicleType;
    if (vehicleData.vehicleBrand) user.vehicleBrand = vehicleData.vehicleBrand;
    if (vehicleData.vehicleModel) user.vehicleModel = vehicleData.vehicleModel;
    if (vehicleData.batteryCapacity) user.batteryCapacity = vehicleData.batteryCapacity;
    if (vehicleData.connectorType) user.connectorType = vehicleData.connectorType;

    await this.userRepository.save(user);

    return this.getUserProfile(userId);
  }
}
