import { Controller, Post, Body, ValidationPipe, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.authService.validateUser(req.user.userId);
    
    if (!user) {
      return { error: 'User not found' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        // Add computed boolean flags for role-based checks
        isOwner: user.role === 'owner' || user.role === 'admin',
        isMechanic: user.role === 'mechanic' || user.role === 'admin',
        isAdmin: user.role === 'admin',
      },
    };
  }
}
