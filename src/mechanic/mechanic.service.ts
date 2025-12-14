import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MechanicApplication,
  ApplicationStatus,
} from './entities/mechanic-application.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { CreateMechanicApplicationDto } from './dto/create-mechanic-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

@Injectable()
export class MechanicService {
  constructor(
    @InjectRepository(MechanicApplication)
    private applicationRepository: Repository<MechanicApplication>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
  ) {}

  /**
   * Submit mechanic application
   */
  async applyAsMechanic(
    createDto: CreateMechanicApplicationDto,
    userId: string,
  ) {
    // Check if user already has a pending or approved application
    const existingApplication = await this.applicationRepository.findOne({
      where: { userId },
    });

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.PENDING) {
        throw new BadRequestException(
          'You already have a pending application',
        );
      }
      if (existingApplication.status === ApplicationStatus.APPROVED) {
        // Check if they have an active mechanic profile
        const mechanicProfile = await this.mechanicRepository.findOne({
          where: { userId },
        });
        
        if (mechanicProfile) {
          // They have an approved application AND active profile
          throw new BadRequestException(
            'You are already approved as a mechanic. Use the mechanic dashboard to manage your profile.',
          );
        }
        
        // They have approved application but NO profile (resigned previously)
        // Allow them to reapply by deleting old application and creating new one
        console.log('🔄 User resigned previously - allowing reapplication:', userId);
        await this.applicationRepository.remove(existingApplication);
      }
    }

    const application = this.applicationRepository.create({
      ...createDto,
      userId,
      status: ApplicationStatus.PENDING,
    });

    const saved = await this.applicationRepository.save(application);

    return {
      ...saved,
      message:
        'Application submitted successfully. You will be notified once reviewed.',
    };
  }

  /**
   * Get user's application status
   */
  async getMyApplication(userId: string) {
    const application = await this.applicationRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('No application found');
    }

    return application;
  }

  /**
   * Get all applications (admin only)
   */
  async getAllApplications(status?: ApplicationStatus) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    const applications = await this.applicationRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return applications;
  }

  /**
   * Get application by ID (admin only)
   */
  async getApplicationById(id: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  /**
   * Review application (admin only)
   */
  async reviewApplication(
    id: string,
    reviewDto: ReviewApplicationDto,
    adminId: string,
  ) {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application has already been reviewed');
    }

    application.status = reviewDto.status;
    if (reviewDto.reviewNotes) {
      application.reviewNotes = reviewDto.reviewNotes;
    }
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();

    // If approved, create mechanic profile and upgrade user role
    if (reviewDto.status === ApplicationStatus.APPROVED) {
      const user = await this.userRepository.findOne({
        where: { id: application.userId },
      });

      if (user) {
        // Update user role to mechanic
        user.role = 'mechanic';
        await this.userRepository.save(user);

        // Check if mechanic profile already exists
        const existingMechanic = await this.mechanicRepository.findOne({
          where: { userId: application.userId },
        });

        // Create mechanic profile if it doesn't exist
        if (!existingMechanic) {
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
        }
      }
    }

    const updated = await this.applicationRepository.save(application);

    return {
      ...updated,
      message: `Application ${reviewDto.status.toLowerCase()} successfully`,
    };
  }

  /**
   * Get all mechanics (for breakdown assignment)
   */
  async getAllMechanics() {
    const mechanics = await this.userRepository.find({
      where: { role: 'mechanic' },
      select: ['id', 'name', 'phoneNumber', 'role', 'createdAt'],
    });

    return mechanics;
  }
}
