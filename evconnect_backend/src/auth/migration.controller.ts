import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { VehicleProfile } from './entities/vehicle-profile.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth/migration')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(VehicleProfile)
    private vehicleProfileRepository: Repository<VehicleProfile>,
  ) {}

  @Post('migrate-vehicle-profiles')
  async migrateVehicleProfiles() {
    try {
      // Find all users with vehicle data but potentially no vehicle profile
      const usersWithVehicleData = await this.userRepository
        .createQueryBuilder('user')
        .where('user.vehicleType IS NOT NULL')
        .andWhere('user.vehicleBrand IS NOT NULL')
        .andWhere('user.vehicleModel IS NOT NULL')
        .getMany();

      this.logger.log(`Found ${usersWithVehicleData.length} users with vehicle data in UserEntity`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const user of usersWithVehicleData) {
        // Check if vehicle profile already exists
        const existingProfile = await this.vehicleProfileRepository.findOne({
          where: { userId: user.id },
        });

        if (existingProfile) {
          this.logger.debug(`User ${user.name} (${user.id}) already has a vehicle profile, skipping`);
          skippedCount++;
          continue;
        }

        // Create vehicle profile from user data
        const vehicleProfile = this.vehicleProfileRepository.create({
          userId: user.id,
          make: user.vehicleBrand,
          model: user.vehicleModel,
          year: new Date().getFullYear(),
          batteryCapacity: user.batteryCapacity || 50,
          connectorType: (user.connectorTypes && user.connectorTypes.length > 0) ? user.connectorTypes[0] : 'Type2',
          rangeKm: 300,
          isPrimary: true,
        });

        await this.vehicleProfileRepository.save(vehicleProfile);
        migratedCount++;
        this.logger.log(`✅ Created vehicle profile for user ${user.name} (${user.id})`);
      }

      return {
        success: true,
        message: `Migration completed!`,
        stats: {
          totalUsersWithVehicleData: usersWithVehicleData.length,
          migratedCount,
          skippedCount,
        },
      };
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Migration failed',
        error: error.message,
      };
    }
  }
}
