import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
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
    try {
      console.log('🔧 MechanicService.applyAsMechanic called with:', { 
        userId, 
        createDto,
      });

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

      console.log('✅ Creating new application for user:', userId);
      const application = this.applicationRepository.create({
        ...createDto,
        userId,
        status: ApplicationStatus.PENDING,
      });

      console.log('💾 Saving application:', application);
      const saved = await this.applicationRepository.save(application);
      console.log('✅ Application saved successfully:', saved.id);

      return {
        ...saved,
        message:
          'Application submitted successfully. You will be notified once reviewed.',
      };
    } catch (error) {
      console.error('❌ Error in applyAsMechanic (ORM path):', error);

      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException
      }

      // Fallback for schema-drifted mechanic_applications tables.
      try {
        return await this.applyAsMechanicFallback(createDto, userId);
      } catch (fallbackError) {
        if (fallbackError instanceof BadRequestException) {
          throw fallbackError;
        }

        console.error('❌ Error in applyAsMechanic fallback:', {
          message: fallbackError?.message,
          stack: fallbackError?.stack,
          name: fallbackError?.name,
        });

        throw new InternalServerErrorException('Failed to submit mechanic application');
      }
    }
  }

  private async applyAsMechanicFallback(
    createDto: CreateMechanicApplicationDto,
    userId: string,
  ) {
    const columnsResult: Array<{ column_name: string }> =
      await this.applicationRepository.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'mechanic_applications'`,
      );

    const columnNames = new Set(columnsResult.map((column) => column.column_name));
    if (columnNames.size === 0) {
      throw new InternalServerErrorException('mechanic_applications schema not found');
    }

    const toIdentifier = (column: string) =>
      /^[a-z_][a-z0-9_]*$/.test(column) ? column : `"${column}"`;

    const pick = (candidates: string[]): string | null => {
      const found = candidates.find((candidate) => columnNames.has(candidate));
      return found ? toIdentifier(found) : null;
    };

    const userIdCol = pick(['user_id', 'userId']);
    if (!userIdCol) {
      throw new InternalServerErrorException('No user id column in mechanic_applications');
    }

    const statusCol = pick(['status']) || 'status';
    const createdAtCol = pick(['created_at', 'createdAt']) || 'id';

    const existingRows: Array<{ id: string; status: string }> = await this.applicationRepository.query(
      `
        SELECT id, ${statusCol}::text AS status
        FROM mechanic_applications
        WHERE ${userIdCol} = $1
        ORDER BY ${createdAtCol} DESC
        LIMIT 1
      `,
      [userId],
    );

    const existing = existingRows[0];
    if (existing) {
      if (existing.status === ApplicationStatus.PENDING) {
        throw new BadRequestException('You already have a pending application');
      }

      if (existing.status === ApplicationStatus.APPROVED) {
        const mechanicProfile = await this.mechanicRepository.findOne({
          where: { userId },
        });

        if (mechanicProfile) {
          throw new BadRequestException(
            'You are already approved as a mechanic. Use the mechanic dashboard to manage your profile.',
          );
        }

        // Previously approved but profile removed - allow reapplication.
        await this.applicationRepository.query(
          `DELETE FROM mechanic_applications WHERE id = $1`,
          [existing.id],
        );
      }
    }

    const nameCol = pick(['name', 'full_name', 'fullName']);
    const phoneCol = pick(['phone', 'phone_number', 'phoneNumber']);
    const emailCol = pick(['email']);
    const addressCol = pick(['address', 'service_area', 'serviceArea']);
    const latCol = pick(['lat', 'service_lat', 'serviceLat']);
    const lngCol = pick(['lng', 'service_lng', 'serviceLng']);
    const servicesCol = pick(['services', 'skills']);
    const yearsCol = pick(['years_of_experience', 'yearsOfExperience']);
    const certCol = pick(['certifications']);
    const descriptionCol = pick(['description', 'additional_info', 'additionalInfo']);
    const priceCol = pick(['price_per_hour', 'pricePerHour']);
    const licenseCol = pick(['license_number', 'licenseNumber']);

    const insertColumns: string[] = [userIdCol, statusCol];
    const insertValues: string[] = [];
    const params: any[] = [];
    const pushParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };

    insertValues.push(pushParam(userId));
    insertValues.push(pushParam(ApplicationStatus.PENDING));

    if (nameCol) {
      insertColumns.push(nameCol);
      insertValues.push(pushParam(createDto.name));
    }
    if (phoneCol) {
      insertColumns.push(phoneCol);
      insertValues.push(pushParam(createDto.phone));
    }
    if (emailCol) {
      insertColumns.push(emailCol);
      insertValues.push(pushParam(createDto.email ?? null));
    }
    if (addressCol) {
      insertColumns.push(addressCol);
      insertValues.push(pushParam(createDto.address));
    }
    if (latCol) {
      insertColumns.push(latCol);
      insertValues.push(pushParam(createDto.lat));
    }
    if (lngCol) {
      insertColumns.push(lngCol);
      insertValues.push(pushParam(createDto.lng));
    }
    if (servicesCol) {
      insertColumns.push(servicesCol);
      // Some deployments use text[] (services), older ones use text (skills).
      const rawServicesColumn = servicesCol.replaceAll('"', '');
      const serviceValue = rawServicesColumn === 'services'
        ? createDto.services
        : createDto.services.join(', ');
      insertValues.push(pushParam(serviceValue));
    }
    if (yearsCol) {
      insertColumns.push(yearsCol);
      insertValues.push(pushParam(createDto.yearsOfExperience));
    }
    if (certCol) {
      insertColumns.push(certCol);
      insertValues.push(pushParam(createDto.certifications ?? null));
    }
    if (descriptionCol) {
      insertColumns.push(descriptionCol);
      insertValues.push(pushParam(createDto.description ?? null));
    }
    if (priceCol) {
      insertColumns.push(priceCol);
      insertValues.push(pushParam(createDto.pricePerHour));
    }
    if (licenseCol) {
      insertColumns.push(licenseCol);
      insertValues.push(pushParam(createDto.licenseNumber ?? null));
    }

    const rows = await this.applicationRepository.query(
      `
        INSERT INTO mechanic_applications (${insertColumns.join(', ')})
        VALUES (${insertValues.join(', ')})
        RETURNING id
      `,
      params,
    );

    return {
      id: rows?.[0]?.id ?? null,
      userId,
      status: ApplicationStatus.PENDING,
      message:
        'Application submitted successfully. You will be notified once reviewed.',
    };
  }

  /**
   * Get user's application status
   */
  async getMyApplication(userId: string) {
    try {
      const application = await this.applicationRepository.findOne({
        where: { userId },
      });

      if (!application) {
        throw new NotFoundException('No application found');
      }

      return application;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('❌ getMyApplication ORM query failed, trying schema-safe fallback:', {
        userId,
        message: error?.message,
      });

      const fallbackApplication = await this.getMyApplicationFallback(userId);
      if (!fallbackApplication) {
        throw new NotFoundException('No application found');
      }

      return fallbackApplication;
    }
  }

  /**
   * Fallback query for environments where mechanic_applications schema differs
   * between deployments (camelCase vs snake_case columns).
   */
  private async getMyApplicationFallback(userId: string) {
    const columnsResult: Array<{ column_name: string }> =
      await this.applicationRepository.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'mechanic_applications'`,
      );

    const columnNames = new Set(columnsResult.map((column) => column.column_name));

    const userIdColumn = columnNames.has('userId')
      ? '"userId"'
      : columnNames.has('user_id')
        ? 'user_id'
        : null;

    if (!userIdColumn) {
      console.error('❌ getMyApplicationFallback: user id column not found in mechanic_applications');
      return null;
    }

    const reviewNotesColumn = columnNames.has('review_notes')
      ? 'review_notes'
      : columnNames.has('reviewNotes')
        ? '"reviewNotes"'
        : 'NULL';

    const reviewedByColumn = columnNames.has('reviewed_by')
      ? 'reviewed_by'
      : columnNames.has('reviewedBy')
        ? '"reviewedBy"'
        : 'NULL';

    const reviewedAtColumn = columnNames.has('reviewedAt')
      ? '"reviewedAt"'
      : columnNames.has('reviewed_at')
        ? 'reviewed_at'
        : 'NULL';

    const createdAtColumn = columnNames.has('created_at')
      ? 'created_at'
      : columnNames.has('createdAt')
        ? '"createdAt"'
        : 'NULL';

    const updatedAtColumn = columnNames.has('updated_at')
      ? 'updated_at'
      : columnNames.has('updatedAt')
        ? '"updatedAt"'
        : 'NULL';

    const orderByColumn = createdAtColumn == 'NULL' ? 'id' : createdAtColumn;

    const rows = await this.applicationRepository.query(
      `
        SELECT
          id,
          ${userIdColumn} AS "userId",
          status,
          ${reviewNotesColumn} AS "reviewNotes",
          ${reviewedByColumn} AS "reviewedBy",
          ${reviewedAtColumn} AS "reviewedAt",
          ${createdAtColumn} AS "createdAt",
          ${updatedAtColumn} AS "updatedAt"
        FROM mechanic_applications
        WHERE ${userIdColumn} = $1
        ORDER BY ${orderByColumn} DESC
        LIMIT 1
      `,
      [userId],
    );

    return rows?.[0] ?? null;
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
            name: application.name,
            specialization: application.services.join(', '),
            yearsOfExperience: application.yearsOfExperience,
            rating: 0,
            completedJobs: 0,
            available: true,
            services: application.services,
            lat: application.lat,
            lng: application.lng,
            phone: application.phone,
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
