import { DataSource } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { VehicleProfile } from '../auth/entities/vehicle-profile.entity';

/**
 * Migration script to create VehicleProfile entries for existing users
 * who have vehicle data in their UserEntity but no VehicleProfile entry
 */
async function migrateVehicleProfiles() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://akilanishan@localhost:5432/evconnect',
    entities: [UserEntity, VehicleProfile],
  });

  await dataSource.initialize();
  console.log('Database connection established');

  const userRepository = dataSource.getRepository(UserEntity);
  const vehicleProfileRepository = dataSource.getRepository(VehicleProfile);

  try {
    // Find all users with vehicle data but no vehicle profile
    const usersWithVehicleData = await userRepository
      .createQueryBuilder('user')
      .where('user.vehicleType IS NOT NULL')
      .andWhere('user.vehicleBrand IS NOT NULL')
      .andWhere('user.vehicleModel IS NOT NULL')
      .getMany();

    console.log(`Found ${usersWithVehicleData.length} users with vehicle data in UserEntity`);

    let migratedCount = 0;

    for (const user of usersWithVehicleData) {
      // Check if vehicle profile already exists
      const existingProfile = await vehicleProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (existingProfile) {
        console.log(`User ${user.name} (${user.id}) already has a vehicle profile, skipping`);
        continue;
      }

      // Create vehicle profile from user data
      const vehicleProfile = vehicleProfileRepository.create({
        userId: user.id,
        make: user.vehicleBrand,
        model: user.vehicleModel,
        year: new Date().getFullYear(), // Default to current year
        batteryCapacity: user.batteryCapacity || 0,
        connectorType: (user.connectorTypes && user.connectorTypes.length > 0) ? user.connectorTypes[0] : 'Type2',
        rangeKm: 0, // Default value
        isPrimary: true, // First vehicle is primary
      });

      await vehicleProfileRepository.save(vehicleProfile);
      migratedCount++;
      console.log(`✅ Created vehicle profile for user ${user.name} (${user.id})`);
    }

    console.log(`\n✨ Migration completed! Created ${migratedCount} vehicle profiles.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateVehicleProfiles()
  .then(() => {
    console.log('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
