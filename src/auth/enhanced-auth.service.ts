import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UserEntity } from "../users/entities/user.entity";
import { VehicleProfile } from "./entities/vehicle-profile.entity";
import { EnhancedRegisterDto } from "./dto/enhanced-register.dto";

@Injectable()
export class EnhancedAuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(VehicleProfile)
    private vehicleProfileRepository: Repository<VehicleProfile>,
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
      connectorTypes,
      acceptTerms,
      acceptPrivacyPolicy,
    } = registerDto;

    // Validate legal requirements
    if (!acceptTerms || !acceptPrivacyPolicy) {
      throw new BadRequestException(
        "You must accept the terms and conditions and privacy policy",
      );
    }

    // For enhanced registration, use phone number from emailOrPhone
    const phone = emailOrPhone;

    // Check if user already exists (by phone number)
    const existingUser = await this.userRepository.findOne({
      where: { phoneNumber: phone },
    });

    if (existingUser) {
      throw new ConflictException("Phone number already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with complete EV driver profile
    // Handle both single connectorType (old) and multiple connectorTypes (new)
    const finalConnectorTypes =
      connectorTypes && connectorTypes.length > 0
        ? connectorTypes
        : connectorType
          ? [connectorType]
          : [];

    const user = this.userRepository.create({
      name: name,
      phoneNumber: phone,
      password: hashedPassword,
      role: "user", // Default role
      vehicleType: vehicleType,
      vehicleBrand: vehicleBrand,
      vehicleModel: vehicleModel,
      batteryCapacity: batteryCapacity,
      connectorTypes: finalConnectorTypes,
      acceptedTerms: acceptTerms,
      acceptedPrivacyPolicy: acceptPrivacyPolicy,
      termsAcceptedAt: new Date(),
      isVerified: false, // Email/phone verification pending
    });

    await this.userRepository.save(user);

    // Create vehicle profile if vehicle data is provided
    if (vehicleBrand && vehicleModel) {
      try {
        const vehicleProfile = this.vehicleProfileRepository.create({
          userId: user.id,
          make: vehicleBrand,
          model: vehicleModel,
          year: new Date().getFullYear(), // Default to current year
          batteryCapacity: Number(batteryCapacity),
          connectorType:
            finalConnectorTypes.length > 0 ? finalConnectorTypes[0] : "Type2",
          rangeKm: 300, // Default value (reasonable estimate), user can update later
          isPrimary: true, // First vehicle is primary
        });

        await this.vehicleProfileRepository.save(vehicleProfile);
        console.log(`✅ Created vehicle profile for user ${user.phoneNumber}`);
      } catch (error) {
        console.error("❌ Error creating vehicle profile:", error);
        // Don't fail registration if vehicle profile creation fails
      }
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        vehicleProfile: {
          vehicleType: user.vehicleType,
          vehicleBrand: user.vehicleBrand,
          vehicleModel: user.vehicleModel,
          batteryCapacity: user.batteryCapacity,
          connectorTypes: user.connectorTypes,
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
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      role: user.role,
      vehicleProfile: {
        vehicleType: user.vehicleType,
        vehicleBrand: user.vehicleBrand,
        vehicleModel: user.vehicleModel,
        batteryCapacity: user.batteryCapacity,
        connectorTypes: user.connectorTypes,
      },
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update vehicle profile
   */
  async updateVehicleProfile(
    userId: string,
    vehicleData: Partial<EnhancedRegisterDto>,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Update only vehicle-related fields
    if (vehicleData.vehicleType) user.vehicleType = vehicleData.vehicleType;
    if (vehicleData.vehicleBrand) user.vehicleBrand = vehicleData.vehicleBrand;
    if (vehicleData.vehicleModel) user.vehicleModel = vehicleData.vehicleModel;
    if (vehicleData.batteryCapacity)
      user.batteryCapacity = vehicleData.batteryCapacity;

    // Handle both single connectorType and array connectorTypes
    if (vehicleData.connectorTypes && vehicleData.connectorTypes.length > 0) {
      user.connectorTypes = vehicleData.connectorTypes;
    } else if (vehicleData.connectorType) {
      user.connectorTypes = [vehicleData.connectorType];
    }

    await this.userRepository.save(user);

    return this.getUserProfile(userId);
  }
}
