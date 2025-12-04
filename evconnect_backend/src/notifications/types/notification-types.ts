export enum NotificationType {
  // Charging
  CHARGING_STARTED = 'charging_started',
  CHARGING_80_PERCENT = 'charging_80_percent',
  CHARGING_COMPLETED = 'charging_completed',
  CHARGING_STOPPED = 'charging_stopped',
  CHARGER_DISCONNECTED = 'charger_disconnected',
  LOW_BATTERY_WARNING = 'low_battery_warning',

  // Booking
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_AUTO_CANCELLED = 'booking_auto_cancelled',
  ALTERNATIVE_CHARGER = 'alternative_charger',

  // Payment
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',

  // Marketplace
  NEW_MESSAGE = 'new_message',
  ITEM_SOLD = 'item_sold',
  PRICE_DROP = 'price_drop',
  LISTING_APPROVED = 'listing_approved',
  LISTING_REJECTED = 'listing_rejected',

  // Mechanic
  MECHANIC_ASSIGNED = 'mechanic_assigned',
  MECHANIC_ON_WAY = 'mechanic_on_way',
  SERVICE_COMPLETED = 'service_completed',

  // Location-based (NEW)
  CHARGER_AVAILABLE_NEARBY = 'charger_available_nearby',
  
  // Pricing (NEW)
  PRICE_DROP_ALERT = 'price_drop_alert',
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}
