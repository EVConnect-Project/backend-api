export interface BookingSettings {
  minBookingMinutes: number;      // Minimum booking duration
  maxBookingMinutes: number;      // Maximum booking duration
  advanceBookingDays: number;     // How many days in advance can book
  gracePeriodMinutes: number;     // Grace period for no-shows
  allowSameDayBooking: boolean;   // Allow same-day bookings
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  minBookingMinutes: 30,
  maxBookingMinutes: 180,
  advanceBookingDays: 7,
  gracePeriodMinutes: 10,
  allowSameDayBooking: true,
};
