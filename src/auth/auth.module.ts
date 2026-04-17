import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EnhancedAuthController } from './enhanced-auth.controller';
import { EnhancedAuthService } from './enhanced-auth.service';
import { VehicleProfileController } from './vehicle-profile.controller';
import { VehicleProfileService } from './vehicle-profile.service';
import { MigrationController } from './migration.controller';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { UserEntity } from '../users/entities/user.entity';
import { VehicleProfile } from './entities/vehicle-profile.entity';
import { OtpVerification } from './otp.service';
import { Charger } from '../charger/entities/charger.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, VehicleProfile, Charger, MechanicEntity, OtpVerification]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET environment variable is not set');
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '24h') as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, EnhancedAuthController, VehicleProfileController, MigrationController],
  providers: [AuthService, EnhancedAuthService, VehicleProfileService, OtpService, SmsService, JwtStrategy],
  exports: [AuthService, EnhancedAuthService, JwtModule, VehicleProfileService, SmsService],
})
export class AuthModule {}
