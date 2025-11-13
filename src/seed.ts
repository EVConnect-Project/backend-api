import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './auth/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function createAdminUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(getRepositoryToken(User));

  const adminEmail = 'admin@evconnect.com';
  
  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
  
  if (existingAdmin) {
    console.log('Admin user already exists');
    await app.close();
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = userRepository.create({
    email: adminEmail,
    password: hashedPassword,
    name: 'Admin User',
    role: 'admin',
    isVerified: true,
    isBanned: false,
  });

  await userRepository.save(admin);
  console.log('✅ Admin user created successfully!');
  console.log('Email: admin@evconnect.com');
  console.log('Password: admin123');
  console.log('⚠️  Please change the password in production!');

  await app.close();
}

createAdminUser()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
