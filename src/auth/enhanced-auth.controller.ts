import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
  Patch,
} from "@nestjs/common";
import { EnhancedAuthService } from "./enhanced-auth.service";
import { EnhancedRegisterDto } from "./dto/enhanced-register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class EnhancedAuthController {
  constructor(private readonly enhancedAuthService: EnhancedAuthService) {}

  /**
   * POST /api/auth/register-enhanced
   *
   * Enhanced registration endpoint with vehicle profile
   *
   * @param registerDto - Complete registration data including vehicle info
   * @returns JWT token and user profile
   */
  @Post("register-enhanced")
  async registerEnhanced(
    @Body(ValidationPipe) registerDto: EnhancedRegisterDto,
  ) {
    return this.enhancedAuthService.registerEnhanced(registerDto);
  }

  /**
   * GET /api/auth/profile
   *
   * Get complete user profile including vehicle information
   * Requires authentication
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.enhancedAuthService.getUserProfile(req.user.id);
  }

  /**
   * PATCH /api/auth/vehicle-profile
   *
   * Update vehicle profile information
   * Requires authentication
   */
  @Patch("vehicle-profile")
  @UseGuards(JwtAuthGuard)
  async updateVehicleProfile(
    @Request() req,
    @Body(ValidationPipe) vehicleData: Partial<EnhancedRegisterDto>,
  ) {
    return this.enhancedAuthService.updateVehicleProfile(
      req.user.id,
      vehicleData,
    );
  }
}
