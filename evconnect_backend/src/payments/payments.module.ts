import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentsController } from './payments.controller';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { UserPaymentSettingsEntity } from './entities/user-payment-settings.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      PaymentMethodEntity,
      UserPaymentSettingsEntity,
      BookingEntity,
    ]),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentMethodsService, PaymentSettingsService],
  exports: [PaymentsService, PaymentMethodsService, PaymentSettingsService],
})
export class PaymentsModule {}
