import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @Body(ValidationPipe) createBookingDto: CreateBookingDto,
    @Request() req,
  ) {
    return this.bookingsService.create(createBookingDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('my-bookings')
  findMyBookings(@Request() req) {
    return this.bookingsService.findByUser(req.user.userId);
  }

  @Get('charger/:chargerId')
  findByCharger(@Param('chargerId') chargerId: string) {
    return this.bookingsService.findByCharger(chargerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.bookingsService.cancel(id, req.user.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.bookingsService.updateStatus(id, status);
  }
}
