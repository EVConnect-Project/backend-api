import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Between, DataSource, In, Repository } from "typeorm";
import { ServiceStationBookingEntity } from "./entities/service-station-booking.entity";
import { ServiceStationEntity } from "../service-stations/entities/service-station.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/types/notification-types";
import {
  CompleteServiceStationBookingDto,
  CreateServiceStationBookingDto,
  RateServiceStationBookingDto,
} from "./dto/service-station-booking.dto";

interface AvailabilityWindow {
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export interface SlotListing {
  date: string;
  slots: string[];
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const SLOT_MINUTES = 60;
const REMINDER_LEAD_MINUTES = 60; // 1h reminder
const BLOCKING_STATUSES = ["confirmed", "in_progress"];

@Injectable()
export class ServiceStationBookingsService {
  private readonly logger = new Logger(ServiceStationBookingsService.name);

  constructor(
    @InjectRepository(ServiceStationBookingEntity)
    private readonly bookingRepository: Repository<ServiceStationBookingEntity>,
    @InjectRepository(ServiceStationEntity)
    private readonly stationRepository: Repository<ServiceStationEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List the still-available time slots at a station for a given ISO date.
   *
   * Algorithm:
   * 1. Resolve the station's open/close window for the requested weekday.
   *    Stations marked `is24Hours` get a 00:00–23:00 window.
   * 2. Generate fixed 60-minute slots between open and close.
   * 3. Drop slots already taken by a confirmed/in-progress booking, and
   *    drop slots already in the past when querying today's date.
   */
  async listAvailableSlots(
    stationId: string,
    date: string,
  ): Promise<SlotListing> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }

    const station = await this.stationRepository.findOne({
      where: { id: stationId },
    });
    if (!station || station.isBanned) {
      throw new NotFoundException("Service station not found");
    }

    const window = this.windowForDate(station, date);
    if (!window) {
      return { date, slots: [] };
    }

    const allSlots = this.generateSlots(window);

    const taken = await this.bookingRepository.find({
      where: {
        stationId,
        appointmentDate: date,
        status: In(BLOCKING_STATUSES),
      },
      select: { slotTime: true },
    });
    const takenSet = new Set(taken.map((b) => b.slotTime));

    const now = new Date();
    const isToday = date === this.formatIsoDate(now);

    const available = allSlots.filter((slot) => {
      if (takenSet.has(slot)) return false;
      if (isToday && this.slotIsInPast(slot, now)) return false;
      return true;
    });

    return { date, slots: available };
  }

  async createBooking(
    userId: string,
    stationId: string,
    dto: CreateServiceStationBookingDto,
  ): Promise<ServiceStationBookingEntity> {
    const station = await this.stationRepository.findOne({
      where: { id: stationId },
    });
    if (!station || station.isBanned || !station.verified) {
      throw new NotFoundException("Service station not available");
    }

    if (
      Array.isArray(station.serviceCategories) &&
      station.serviceCategories.length > 0 &&
      !station.serviceCategories.includes(dto.serviceType)
    ) {
      throw new BadRequestException(
        "Selected service type is not offered by this station",
      );
    }

    // Validate that the requested slot is within the station's window AND
    // exists in the slot grid (no half-hour quirks).
    const window = this.windowForDate(station, dto.appointmentDate);
    if (!window) {
      throw new BadRequestException("Station is closed on the chosen date");
    }
    const validSlots = this.generateSlots(window);
    if (!validSlots.includes(dto.slotTime)) {
      throw new BadRequestException(
        "Requested slot is outside the station's opening hours",
      );
    }
    if (
      dto.appointmentDate === this.formatIsoDate(new Date()) &&
      this.slotIsInPast(dto.slotTime, new Date())
    ) {
      throw new BadRequestException("Cannot book a slot in the past");
    }

    // Two users hitting the same slot simultaneously: a row lock on the
    // station row serializes the check + insert. The booking insert itself
    // is the source of truth.
    const saved = await this.dataSource.transaction(async (em) => {
      await em.query(
        `SELECT id FROM service_stations WHERE id = $1 FOR UPDATE`,
        [stationId],
      );

      const clash = await em.getRepository(ServiceStationBookingEntity).findOne(
        {
          where: {
            stationId,
            appointmentDate: dto.appointmentDate,
            slotTime: dto.slotTime,
            status: In(BLOCKING_STATUSES),
          },
        },
      );
      if (clash) {
        throw new BadRequestException("This slot was just booked. Pick another.");
      }

      const repo = em.getRepository(ServiceStationBookingEntity);
      const booking = repo.create({
        userId,
        stationId,
        appointmentDate: dto.appointmentDate,
        slotTime: dto.slotTime,
        serviceType: dto.serviceType,
        notes: dto.notes ?? null,
        status: "confirmed",
      });
      return repo.save(booking);
    });

    // Notification is fire-and-forget so the user gets their HTTP response
    // even if FCM is slow or unavailable.
    this.notifyBookingConfirmed(saved, station.stationName).catch((err) =>
      this.logger.warn(
        `Failed to send station booking confirmation for ${saved.id}: ${String(err)}`,
      ),
    );

    return saved;
  }

  async listMyBookings(userId: string): Promise<ServiceStationBookingEntity[]> {
    return this.bookingRepository.find({
      where: { userId },
      order: { appointmentDate: "DESC", slotTime: "DESC" },
      relations: ["station"],
      take: 100,
    });
  }

  async cancelBooking(
    userId: string,
    bookingId: string,
  ): Promise<ServiceStationBookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["station"],
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException("Not your booking");
    }
    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new BadRequestException(
        `Booking is already ${booking.status} and cannot be cancelled`,
      );
    }

    booking.status = "cancelled";
    const saved = await this.bookingRepository.save(booking);

    this.notifyBookingCancelled(
      saved,
      booking.station?.stationName ?? "your service station",
    ).catch((err) =>
      this.logger.warn(
        `Failed to send station booking cancellation for ${saved.id}: ${String(err)}`,
      ),
    );
    return saved;
  }

  async completeBooking(
    ownerId: string,
    bookingId: string,
    dto: CompleteServiceStationBookingDto,
  ): Promise<ServiceStationBookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["station"],
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    if (!booking.station || booking.station.ownerId !== ownerId) {
      throw new ForbiddenException(
        "Only the station owner can mark a booking complete",
      );
    }
    if (booking.status === "completed") {
      return booking;
    }
    if (booking.status === "cancelled") {
      throw new BadRequestException(
        "Cancelled bookings cannot be marked complete",
      );
    }

    booking.status = "completed";
    booking.completedAt = new Date();
    if (dto.notes) {
      booking.notes = dto.notes;
    }
    const saved = await this.bookingRepository.save(booking);

    this.notifyBookingCompleted(saved, booking.station.stationName).catch(
      (err) =>
        this.logger.warn(
          `Failed to send station booking completion for ${saved.id}: ${String(err)}`,
        ),
    );
    return saved;
  }

  async rateBooking(
    userId: string,
    bookingId: string,
    dto: RateServiceStationBookingDto,
  ): Promise<ServiceStationBookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException("Not your booking");
    }
    if (booking.status !== "completed") {
      throw new BadRequestException(
        "You can only rate a completed booking",
      );
    }

    booking.rating = dto.rating;
    if (dto.feedback) {
      booking.feedback = dto.feedback;
    }
    return this.bookingRepository.save(booking);
  }

  /**
   * Remind users about appointments starting in the next REMINDER_LEAD_MINUTES.
   * Runs every minute; we use a 1-min sweep window so we never double-send
   * (a booking only matches once because the window moves on with the clock).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendDueReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() + REMINDER_LEAD_MINUTES * 60_000,
    );
    const windowEnd = new Date(windowStart.getTime() + 60_000);

    const startDate = this.formatIsoDate(windowStart);
    const endDate = this.formatIsoDate(windowEnd);
    const startSlot = this.formatSlot(windowStart);
    const endSlot = this.formatSlot(windowEnd);

    // Date + slot range — for the common case both ends fall on the same
    // ISO date so this is one cheap range query.
    try {
      const due = await this.bookingRepository.find({
        where: {
          status: "confirmed",
          appointmentDate: startDate === endDate ? startDate : Between(startDate, endDate),
          slotTime: Between(startSlot, endSlot),
        },
        relations: ["station"],
        take: 100,
      });

      await Promise.allSettled(
        due.map((booking) =>
          this.notifyBookingReminder(
            booking,
            booking.station?.stationName ?? "your service station",
          ),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `Station booking reminder cron failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---------------------------------------------------------------- helpers

  private windowForDate(
    station: ServiceStationEntity,
    date: string,
  ): AvailabilityWindow | null {
    const hours = station.openingHours;
    if (!hours || hours.is24Hours) {
      return { open: "00:00", close: "23:00" };
    }

    const dayKey = DAY_KEYS[new Date(date + "T00:00:00Z").getUTCDay()];
    const slot = hours.schedule?.[dayKey];
    if (!slot || slot.closed || !slot.open || !slot.close) {
      return null;
    }
    return { open: slot.open, close: slot.close };
  }

  private generateSlots(window: AvailabilityWindow): string[] {
    const [openH, openM] = window.open.split(":").map(Number);
    const [closeH, closeM] = window.close.split(":").map(Number);
    const start = openH * 60 + openM;
    const end = closeH * 60 + closeM;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return [];
    }

    const slots: string[] = [];
    for (let m = start; m + SLOT_MINUTES <= end + 1; m += SLOT_MINUTES) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }

  private slotIsInPast(slot: string, now: Date): boolean {
    const [h, m] = slot.split(":").map(Number);
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    return h * 60 + m <= minuteOfDay;
  }

  private formatIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatSlot(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // --- notification fan-out (typed via existing NotificationType enum) -----

  private async notifyBookingConfirmed(
    booking: ServiceStationBookingEntity,
    stationName: string,
  ) {
    await this.notificationsService.sendToUser(
      booking.userId,
      NotificationType.BOOKING_CONFIRMED,
      {
        title: "Service appointment confirmed",
        body: `${stationName} on ${booking.appointmentDate} at ${booking.slotTime}`,
        data: {
          serviceStationBookingId: booking.id,
          navigate: `/service-bookings/${booking.id}`,
        },
      },
    );
  }

  private async notifyBookingCancelled(
    booking: ServiceStationBookingEntity,
    stationName: string,
  ) {
    await this.notificationsService.sendToUser(
      booking.userId,
      NotificationType.BOOKING_CANCELLED,
      {
        title: "Service appointment cancelled",
        body: `${stationName} on ${booking.appointmentDate} at ${booking.slotTime}`,
        data: {
          serviceStationBookingId: booking.id,
          navigate: `/service-bookings/${booking.id}`,
        },
      },
    );
  }

  private async notifyBookingCompleted(
    booking: ServiceStationBookingEntity,
    stationName: string,
  ) {
    await this.notificationsService.sendToUser(
      booking.userId,
      NotificationType.SERVICE_COMPLETED,
      {
        title: "Service completed",
        body: `${stationName}: tap to rate your appointment`,
        data: {
          serviceStationBookingId: booking.id,
          navigate: `/service-bookings/${booking.id}/rate`,
        },
      },
    );
  }

  private async notifyBookingReminder(
    booking: ServiceStationBookingEntity,
    stationName: string,
  ) {
    await this.notificationsService.sendToUser(
      booking.userId,
      NotificationType.BOOKING_REMINDER,
      {
        title: "Service appointment soon",
        body: `${stationName} at ${booking.slotTime} (in ~${REMINDER_LEAD_MINUTES} min)`,
        data: {
          serviceStationBookingId: booking.id,
          navigate: `/service-bookings/${booking.id}`,
        },
      },
    );
  }
}
