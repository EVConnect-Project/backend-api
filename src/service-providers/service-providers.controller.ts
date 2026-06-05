import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServiceProvidersService } from "./service-providers.service";
import { ServiceStationBookingsService } from "./service-station-bookings.service";
import {
  CompleteServiceStationBookingDto,
  CreateServiceStationBookingDto,
  RateServiceStationBookingDto,
} from "./dto/service-station-booking.dto";

type ServiceMode = "emergency" | "planned";
type ProviderType = "individual_mechanic" | "service_station";

@Controller("service-providers")
export class ServiceProvidersController {
  constructor(
    private readonly serviceProvidersService: ServiceProvidersService,
    private readonly stationBookingsService: ServiceStationBookingsService,
  ) {}

  @Get("search")
  async search(
    @Query("mode") mode: ServiceMode = "planned",
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radius") radius?: string,
    @Query("issueType") issueType?: string,
    @Query("userId") userId?: string,
    @Query("providerType") providerType?: ProviderType,
    @Query("urgency") urgency?: "low" | "medium" | "high" | "critical",
  ) {
    const parsedMode: ServiceMode =
      mode === "emergency" ? "emergency" : "planned";
    const parsedLat = lat != null ? parseFloat(lat) : undefined;
    const parsedLng = lng != null ? parseFloat(lng) : undefined;
    const parsedRadius = radius != null ? parseFloat(radius) : 20;

    return this.serviceProvidersService.searchProviders({
      mode: parsedMode,
      lat: Number.isFinite(parsedLat as number) ? parsedLat : undefined,
      lng: Number.isFinite(parsedLng as number) ? parsedLng : undefined,
      radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : 20,
      issueType: issueType?.trim() || undefined,
      userId: userId?.trim() || undefined,
      providerType,
      urgencyLevel: urgency,
    });
  }

  @Get("stations/:id")
  async getStationById(@Param("id") id: string) {
    return this.serviceProvidersService.getStationById(id);
  }

  @Post("signals")
  @UseGuards(JwtAuthGuard)
  async recordProviderSignal(
    @Body("providerId") providerId: string,
    @Body("providerType") providerType: ProviderType,
    @Body("mode") mode: ServiceMode,
    @Body("action") action: string,
    @Body("issueType") issueType: string | undefined,
    @Request() req,
  ) {
    return this.serviceProvidersService.recordProviderSignal({
      userId: req.user.userId,
      providerId,
      providerType,
      mode,
      action,
      issueType,
    });
  }

  // --- Service-station appointment bookings -------------------------------

  @Get("stations/:id/slots")
  async listStationSlots(
    @Param("id") stationId: string,
    @Query("date") date: string,
  ) {
    return this.stationBookingsService.listAvailableSlots(stationId, date);
  }

  @Post("stations/:id/bookings")
  @UseGuards(JwtAuthGuard)
  async createStationBooking(
    @Param("id") stationId: string,
    @Body() dto: CreateServiceStationBookingDto,
    @Request() req,
  ) {
    return this.stationBookingsService.createBooking(
      req.user.userId,
      stationId,
      dto,
    );
  }

  @Get("stations/bookings/me")
  @UseGuards(JwtAuthGuard)
  async listMyStationBookings(@Request() req) {
    return this.stationBookingsService.listMyBookings(req.user.userId);
  }

  @Patch("stations/bookings/:id/cancel")
  @UseGuards(JwtAuthGuard)
  async cancelStationBooking(
    @Param("id") bookingId: string,
    @Request() req,
  ) {
    return this.stationBookingsService.cancelBooking(
      req.user.userId,
      bookingId,
    );
  }

  @Post("stations/bookings/:id/complete")
  @UseGuards(JwtAuthGuard)
  async completeStationBooking(
    @Param("id") bookingId: string,
    @Body() dto: CompleteServiceStationBookingDto,
    @Request() req,
  ) {
    return this.stationBookingsService.completeBooking(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @Post("stations/bookings/:id/rate")
  @UseGuards(JwtAuthGuard)
  async rateStationBooking(
    @Param("id") bookingId: string,
    @Body() dto: RateServiceStationBookingDto,
    @Request() req,
  ) {
    return this.stationBookingsService.rateBooking(
      req.user.userId,
      bookingId,
      dto,
    );
  }
}
