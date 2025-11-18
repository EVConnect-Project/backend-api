import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../users/entities/user.entity';
import { Charger } from '../charger/entities/charger.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

export async function seedDatabase(dataSource: DataSource) {
  console.log('🌱 Starting database seeding...');

  const userRepository = dataSource.getRepository(UserEntity);
  const chargerRepository = dataSource.getRepository(Charger);
  const mechanicRepository = dataSource.getRepository(MechanicEntity);

  // Check if users already exist
  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    console.log('⚠️  Database already has users.');
    
    // Check if we need to add mechanics
    const existingMechanics = await mechanicRepository.count();
    if (existingMechanics === 0) {
      console.log('🔧 Adding sample mechanics...');
      
      // Get existing mechanic users or create them
      let mechanics = await userRepository.find({ where: { role: 'mechanic' } });
      
      if (mechanics.length === 0) {
        console.log('📝 Creating mechanic users...');
        const hashedPassword = await bcrypt.hash('Mechanic@123', 10);
        
        // Create mechanic users
        const mechanicUsers = [
          { email: 'quickfix@example.com', password: hashedPassword, name: 'Quick Fix Auto', role: 'mechanic' as const },
          { email: 'evspecialist@example.com', password: hashedPassword, name: 'EV Specialist', role: 'mechanic' as const },
          { email: 'allroundauto@example.com', password: hashedPassword, name: 'All-Round Auto', role: 'mechanic' as const },
          { email: 'mobilemech@example.com', password: hashedPassword, name: 'Mobile Mechanic', role: 'mechanic' as const },
          { email: 'premiumauto@example.com', password: hashedPassword, name: 'Premium Auto', role: 'mechanic' as const },
          { email: 'budgetrepairs@example.com', password: hashedPassword, name: 'Budget Repairs', role: 'mechanic' as const },
        ];
        
        for (const mechanicUser of mechanicUsers) {
          const user = userRepository.create(mechanicUser);
          await userRepository.save(user);
          mechanics.push(user);
        }
        
        console.log('✅ Created 6 mechanic users');
      }

      const sampleMechanics = [
        {
          userId: mechanics[0]?.id || 'mech-1',
          name: 'Quick Fix Auto Services',
          services: ['Battery Jump Start', 'Tire Change', 'Minor Repairs', 'Towing'],
          specialization: 'Emergency Roadside Assistance',
          yearsOfExperience: 8,
          lat: 7.142059,
          lng: 80.087264,
          rating: 4.8,
          phone: '+94771234567',
          email: 'quickfix@example.com',
          description: 'Fast and reliable emergency roadside assistance. Available 24/7 for battery jumps, tire changes, and minor repairs.',
          available: true,
          pricePerHour: 75.00,
          completedJobs: 156,
          licenseNumber: 'MEC-2024-001',
          certifications: 'ASE Certified, AAA Approved',
        },
        {
          userId: mechanics[1]?.id || 'mech-2',
          name: 'EV Specialist Garage',
          services: ['EV Diagnostics', 'Battery Repair', 'Charging System', 'Software Updates'],
          specialization: 'Electric Vehicle Specialist',
          yearsOfExperience: 5,
          lat: 6.9271,
          lng: 79.8612,
          rating: 4.9,
          phone: '+94772345678',
          email: 'evspecialist@example.com',
          description: 'Specialized in electric vehicle maintenance and repair. Expert in EV battery systems and charging infrastructure.',
          available: true,
          pricePerHour: 120.00,
          completedJobs: 89,
          licenseNumber: 'MEC-2024-002',
          certifications: 'Tesla Certified, EV Safety Specialist',
        },
        {
          userId: mechanics[2]?.id || 'mech-3',
          name: 'All-Round Auto Care',
          services: ['Engine Repair', 'Transmission', 'Brake Service', 'AC Service', 'Oil Change'],
          specialization: 'General Auto Repair',
          yearsOfExperience: 12,
          lat: 7.2906,
          lng: 80.6337,
          rating: 4.6,
          phone: '+94773456789',
          email: 'allroundauto@example.com',
          description: 'Comprehensive auto repair services for all makes and models. From routine maintenance to major repairs.',
          available: true,
          pricePerHour: 85.00,
          completedJobs: 234,
          licenseNumber: 'MEC-2024-003',
          certifications: 'SLAMA Member, ISO 9001 Certified',
        },
        {
          userId: 'mech-mobile-1',
          name: 'Mobile Mechanic Pro',
          services: ['Mobile Service', 'Tire Change', 'Battery Service', 'Minor Repairs'],
          specialization: 'Mobile Mechanic',
          yearsOfExperience: 6,
          lat: 6.8825,
          lng: 79.8585,
          rating: 4.7,
          phone: '+94774567890',
          email: 'mobilemech@example.com',
          description: 'We come to you! Mobile mechanic service available across Colombo. No need to tow your vehicle.',
          available: true,
          pricePerHour: 95.00,
          completedJobs: 178,
          licenseNumber: 'MEC-2024-004',
          certifications: 'Mobile Service Certified',
        },
        {
          userId: 'mech-premium-1',
          name: 'Premium Auto Workshop',
          services: ['Luxury Car Service', 'Engine Tuning', 'Paint & Body', 'Interior Detailing'],
          specialization: 'Luxury & Performance Vehicles',
          yearsOfExperience: 15,
          lat: 7.1807,
          lng: 79.8844,
          rating: 5.0,
          phone: '+94775678901',
          email: 'premiumauto@example.com',
          description: 'Exclusive service for luxury and performance vehicles. Expert technicians with factory training.',
          available: false,
          pricePerHour: 200.00,
          completedJobs: 312,
          licenseNumber: 'MEC-2024-005',
          certifications: 'Mercedes-Benz Certified, BMW Specialist',
        },
        {
          userId: 'mech-budget-1',
          name: 'Budget Friendly Repairs',
          services: ['Basic Repairs', 'Oil Change', 'Tire Service', 'Battery Replacement'],
          specialization: 'Affordable Auto Care',
          yearsOfExperience: 4,
          lat: 7.2008,
          lng: 79.8358,
          rating: 4.3,
          phone: '+94776789012',
          email: 'budgetrepairs@example.com',
          description: 'Quality auto care at affordable prices. Perfect for routine maintenance and basic repairs.',
          available: true,
          pricePerHour: 50.00,
          completedJobs: 67,
          licenseNumber: 'MEC-2024-006',
          certifications: 'Basic Auto Repair Certified',
        },
      ];

      for (const mechanicData of sampleMechanics) {
        const mechanic = mechanicRepository.create(mechanicData);
        await mechanicRepository.save(mechanic);
      }
      console.log(`✅ Created ${sampleMechanics.length} sample mechanics`);
    } else {
      console.log(`Mechanics already exist (${existingMechanics} found)`);
    }
    
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Admin User
  const admin = userRepository.create({
    email: 'admin@evconnect.com',
    password: hashedPassword,
    name: 'Admin User',
    role: 'admin',
    isVerified: true,
  });
  await userRepository.save(admin);
  console.log('✅ Created admin user');

  // 2. Normal Users (5)
  const normalUsers: UserEntity[] = [];
  for (let i = 1; i <= 5; i++) {
    const user = userRepository.create({
      email: `user${i}@example.com`,
      password: hashedPassword,
      name: `User ${i}`,
      role: 'user',
      isVerified: true,
    });
    await userRepository.save(user);
    normalUsers.push(user);
  }
  console.log('✅ Created 5 normal users');

  // 3. Charger Owners (3)
  const owners: UserEntity[] = [];
  for (let i = 1; i <= 3; i++) {
    const owner = userRepository.create({
      email: `owner${i}@example.com`,
      password: hashedPassword,
      name: `Charger Owner ${i}`,
      role: 'owner',
      isVerified: true,
    });
    await userRepository.save(owner);
    owners.push(owner);
  }
  console.log('✅ Created 3 charger owners');

  // 4. Mechanics (3)
  const mechanics: UserEntity[] = [];
  for (let i = 1; i <= 3; i++) {
    const mechanic = userRepository.create({
      email: `mechanic${i}@example.com`,
      password: hashedPassword,
      name: `Mechanic ${i}`,
      role: 'mechanic',
      isVerified: true,
    });
    await userRepository.save(mechanic);
    mechanics.push(mechanic);
  }
  console.log('✅ Created 3 mechanics');

  // 5. Create sample chargers for owners
  const sampleChargers = [
    {
      name: 'Downtown Charging Hub',
      lat: 6.9271,
      lng: 79.8612,
      powerKw: 50,
      pricePerKwh: 25,
      description: 'Fast charging station in the heart of Colombo',
      verified: true,
      status: 'available' as const,
      ownerId: owners[0].id,
    },
    {
      name: 'Airport Express Charger',
      lat: 7.1807,
      lng: 79.8844,
      powerKw: 150,
      pricePerKwh: 35,
      description: 'Ultra-fast charger near Bandaranaike Airport',
      verified: true,
      status: 'available' as const,
      ownerId: owners[0].id,
    },
    {
      name: 'Galle Road Charging Point',
      lat: 6.8825,
      lng: 79.8585,
      powerKw: 22,
      pricePerKwh: 20,
      description: 'Convenient charging along Galle Road',
      verified: true,
      status: 'available' as const,
      ownerId: owners[1].id,
    },
    {
      name: 'Kandy Hill Station',
      lat: 7.2906,
      lng: 80.6337,
      powerKw: 50,
      pricePerKwh: 28,
      description: 'Mountain city charging facility',
      verified: true,
      status: 'available' as const,
      ownerId: owners[1].id,
    },
    {
      name: 'Negombo Beach Charger',
      lat: 7.2008,
      lng: 79.8358,
      powerKw: 22,
      pricePerKwh: 22,
      description: 'Charge while enjoying the beach',
      verified: true,
      status: 'available' as const,
      ownerId: owners[2].id,
    },
    {
      name: 'Pending Approval Charger',
      lat: 6.9344,
      lng: 79.8428,
      powerKw: 50,
      pricePerKwh: 30,
      description: 'New charger awaiting admin verification',
      verified: false,
      status: 'offline' as const,
      ownerId: owners[2].id,
    },
  ];

  for (const chargerData of sampleChargers) {
    const charger = chargerRepository.create(chargerData);
    await chargerRepository.save(charger);
  }
  console.log('✅ Created 6 sample chargers (5 verified, 1 pending)');

  // 6. Create sample mechanic profiles
  const sampleMechanics = [
    {
      userId: mechanics[0].id,
      name: 'Quick Fix Auto Services',
      services: ['Battery Jump Start', 'Tire Change', 'Minor Repairs', 'Towing'],
      specialization: 'Emergency Roadside Assistance',
      yearsOfExperience: 8,
      lat: 7.142059, // Near user location from error
      lng: 80.087264,
      rating: 4.8,
      phone: '+94771234567',
      email: 'quickfix@example.com',
      description: 'Fast and reliable emergency roadside assistance. Available 24/7 for battery jumps, tire changes, and minor repairs.',
      available: true,
      pricePerHour: 75.00,
      completedJobs: 156,
      licenseNumber: 'MEC-2024-001',
      certifications: 'ASE Certified, AAA Approved',
    },
    {
      userId: mechanics[1].id,
      name: 'EV Specialist Garage',
      services: ['EV Diagnostics', 'Battery Repair', 'Charging System', 'Software Updates'],
      specialization: 'Electric Vehicle Specialist',
      yearsOfExperience: 5,
      lat: 6.9271, // Colombo
      lng: 79.8612,
      rating: 4.9,
      phone: '+94772345678',
      email: 'evspecialist@example.com',
      description: 'Specialized in electric vehicle maintenance and repair. Expert in EV battery systems and charging infrastructure.',
      available: true,
      pricePerHour: 120.00,
      completedJobs: 89,
      licenseNumber: 'MEC-2024-002',
      certifications: 'Tesla Certified, EV Safety Specialist',
    },
    {
      userId: mechanics[2].id,
      name: 'All-Round Auto Care',
      services: ['Engine Repair', 'Transmission', 'Brake Service', 'AC Service', 'Oil Change'],
      specialization: 'General Auto Repair',
      yearsOfExperience: 12,
      lat: 7.2906, // Kandy
      lng: 80.6337,
      rating: 4.6,
      phone: '+94773456789',
      email: 'allroundauto@example.com',
      description: 'Comprehensive auto repair services for all makes and models. From routine maintenance to major repairs.',
      available: true,
      pricePerHour: 85.00,
      completedJobs: 234,
      licenseNumber: 'MEC-2024-003',
      certifications: 'SLAMA Member, ISO 9001 Certified',
    },
    {
      userId: mechanics[0].id,
      name: 'Mobile Mechanic Pro',
      services: ['Mobile Service', 'Tire Change', 'Battery Service', 'Minor Repairs'],
      specialization: 'Mobile Mechanic',
      yearsOfExperience: 6,
      lat: 6.8825, // Galle Road area
      lng: 79.8585,
      rating: 4.7,
      phone: '+94774567890',
      email: 'mobilemech@example.com',
      description: 'We come to you! Mobile mechanic service available across Colombo. No need to tow your vehicle.',
      available: true,
      pricePerHour: 95.00,
      completedJobs: 178,
      licenseNumber: 'MEC-2024-004',
      certifications: 'Mobile Service Certified',
    },
    {
      userId: mechanics[1].id,
      name: 'Premium Auto Workshop',
      services: ['Luxury Car Service', 'Engine Tuning', 'Paint & Body', 'Interior Detailing'],
      specialization: 'Luxury & Performance Vehicles',
      yearsOfExperience: 15,
      lat: 7.1807, // Near Airport
      lng: 79.8844,
      rating: 5.0,
      phone: '+94775678901',
      email: 'premiumauto@example.com',
      description: 'Exclusive service for luxury and performance vehicles. Expert technicians with factory training.',
      available: false,
      pricePerHour: 200.00,
      completedJobs: 312,
      licenseNumber: 'MEC-2024-005',
      certifications: 'Mercedes-Benz Certified, BMW Specialist',
    },
    {
      userId: mechanics[2].id,
      name: 'Budget Friendly Repairs',
      services: ['Basic Repairs', 'Oil Change', 'Tire Service', 'Battery Replacement'],
      specialization: 'Affordable Auto Care',
      yearsOfExperience: 4,
      lat: 7.2008, // Negombo
      lng: 79.8358,
      rating: 4.3,
      phone: '+94776789012',
      email: 'budgetrepairs@example.com',
      description: 'Quality auto care at affordable prices. Perfect for routine maintenance and basic repairs.',
      available: true,
      pricePerHour: 50.00,
      completedJobs: 67,
      licenseNumber: 'MEC-2024-006',
      certifications: 'Basic Auto Repair Certified',
    },
  ];

  for (const mechanicData of sampleMechanics) {
    const mechanic = mechanicRepository.create(mechanicData);
    await mechanicRepository.save(mechanic);
  }
  console.log('✅ Created 6 sample mechanics with various specializations');

  console.log('\n🎉 Database seeding completed!\n');
  console.log('📋 Sample Credentials:');
  console.log('━'.repeat(50));
  console.log('👤 Admin:');
  console.log('   Email: admin@evconnect.com');
  console.log('   Password: password123');
  console.log('');
  console.log('👥 Normal Users:');
  console.log('   user1@example.com - user5@example.com');
  console.log('   Password: password123');
  console.log('');
  console.log('🏢 Charger Owners:');
  console.log('   owner1@example.com - owner3@example.com');
  console.log('   Password: password123');
  console.log('');
  console.log('🔧 Mechanics:');
  console.log('   mechanic1@example.com - mechanic3@example.com');
  console.log('   Password: password123');
  console.log('━'.repeat(50));
}
