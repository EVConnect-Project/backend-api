import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import * as crypto from "crypto";

/**
 * OTP Verification Entity
 */
@Entity("otp_verifications")
export class OtpVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  phoneNumber: string;

  @Column({ length: 6 })
  otp: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    private jwtService: JwtService,
  ) {}

  /**
   * Generate a random 6-digit OTP
   */
  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP in database with expiration
   */
  async storeOTP(phoneNumber: string, otp: string): Promise<void> {
    // Check rate limiting: max 3 OTP requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await this.otpRepository.count({
      where: {
        phoneNumber,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (recentAttempts >= 3) {
      throw new BadRequestException(
        "Too many OTP requests. Please try again after an hour.",
      );
    }

    // Invalidate any existing OTPs for this phone number
    await this.otpRepository.update(
      { phoneNumber, isUsed: false },
      { isUsed: true },
    );

    // Store new OTP with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otpRecord = this.otpRepository.create({
      phoneNumber,
      otp,
      expiresAt,
      isUsed: false,
    });

    await this.otpRepository.save(otpRecord);
  }

  /**
   * Validate OTP and return verification token
   */
  async validateOTP(phoneNumber: string, otp: string): Promise<string> {
    const otpRecord = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        otp,
        isUsed: false,
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException("Invalid OTP");
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new UnauthorizedException("OTP has expired");
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await this.otpRepository.save(otpRecord);

    // Generate verification token (valid for 10 minutes)
    const verificationToken = this.jwtService.sign(
      { phoneNumber, type: "verification" },
      { expiresIn: "10m" },
    );

    return verificationToken;
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * Verify the verification token
   */
  verifyToken(token: string): { phoneNumber: string } {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== "verification") {
        throw new UnauthorizedException("Invalid verification token");
      }
      return { phoneNumber: payload.phoneNumber };
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired verification token");
    }
  }
}
