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
    if (user.role !== 'admin') {
      return { valid: false, message: 'Not an admin user' };
    }
    return { valid: true, user: { id: user.id, email: user.email, role: user.role } };
  }
}
