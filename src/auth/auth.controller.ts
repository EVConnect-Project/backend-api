import { Controller, Post, Body, ValidationPipe, Get, UseGuards, Request, Inject, Patch, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendOtpDto, VerifyOtpDto, RegisterPhoneDto, LoginPhoneDto, ResetPasswordDto } from './dto/phone-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from '../charger/entities/charger.entity';
import { MechanicEntity } from '../mechanics/entities/mechanic.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
  ) {}
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(@Request() req, @Body() body: any) {
    const userId = req.user.userId;
    const user = await this.authService.updateUserProfile(userId, body);
    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        countryCode: user.countryCode,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        isOwner: user.role === 'owner' || user.role === 'admin',
        isMechanic: user.role === 'mechanic' || user.role === 'admin',
        isAdmin: user.role === 'admin',
      },
    };
  }

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('admin/login')
  async adminLogin(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Get('admin/verify')
  @UseGuards(JwtAuthGuard)
  async verifyAdmin(@Request() req) {
    const user = req.user;
    
    return {
      valid: user.role === 'admin' && !user.isBanned,
      user: {
        id: user.userId,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.authService.validateUser(req.user.userId);
    
    if (!user) {
      console.log('❌ /auth/me: User not found for ID:', req.user.userId);
      return { error: 'User not found' };
    }

    console.log('🔍 /auth/me: Checking chargers for user:', user.phone, 'ID:', user.id);
    
    // Check if user owns any chargers (determines isOwner status)
    const chargerCount = await this.chargerRepository.count({
      where: { ownerId: user.id },
    });
    const hasChargers = chargerCount > 0;

    // Check if user has an active mechanic profile
    const mechanicProfile = await this.mechanicRepository.findOne({
      where: { userId: user.id },
    });
    const hasMechanicProfile = mechanicProfile !== null;

    console.log('📊 /auth/me: User:', user.phone);
    console.log('   - Role:', user.role);
    console.log('   - Charger count:', chargerCount);
    console.log('   - hasChargers:', hasChargers);
    console.log('   - Has mechanic profile:', hasMechanicProfile);
    console.log('   - Calculated isOwner:', user.role === 'owner' || user.role === 'admin' || hasChargers);
    console.log('   - Calculated isMechanic:', hasMechanicProfile || user.role === 'mechanic' || user.role === 'admin');

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        countryCode: user.countryCode,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        // isOwner is true if user has role 'owner', 'admin', OR owns any chargers
        isOwner: user.role === 'owner' || user.role === 'admin' || hasChargers,
        // isMechanic is true if user has role 'mechanic', has an active mechanic profile, OR is admin
        isMechanic: user.role === 'mechanic' || hasMechanicProfile || user.role === 'admin',
        isAdmin: user.role === 'admin',
      },
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body(ValidationPipe) changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Delete('delete-account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req) {
    return this.authService.deleteAccount(req.user.userId);
  }

  // ==================== PHONE AUTHENTICATION ENDPOINTS ====================

  @Post('send-otp')
  async sendOTP(@Body(ValidationPipe) sendOtpDto: SendOtpDto) {
    return this.authService.sendOTP(sendOtpDto.phoneNumber);
  }

  @Post('verify-otp')
  async verifyOTP(@Body(ValidationPipe) verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOTP(
      verifyOtpDto.phoneNumber,
      verifyOtpDto.otp,
    );
  }

  @Post('resend-otp')
  async resendOTP(@Body(ValidationPipe) sendOtpDto: SendOtpDto) {
    return this.authService.sendOTP(sendOtpDto.phoneNumber);
  }

  @Post('register-phone')
  async registerPhone(@Body(ValidationPipe) registerPhoneDto: RegisterPhoneDto) {
    return this.authService.registerWithPhone(
      registerPhoneDto.phoneNumber,
      registerPhoneDto.password,
      registerPhoneDto.verificationToken,
    );
  }

  @Post('login-phone')
  async loginPhone(@Body(ValidationPipe) loginPhoneDto: LoginPhoneDto) {
    return this.authService.loginWithPhone(
      loginPhoneDto.phoneNumber,
      loginPhoneDto.password,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body(ValidationPipe) sendOtpDto: SendOtpDto) {
    return this.authService.sendPasswordResetOTP(sendOtpDto.phoneNumber);
  }

  @Post('reset-password')
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.phoneNumber,
      resetPasswordDto.newPassword,
      resetPasswordDto.verificationToken,
    );
  }
}
