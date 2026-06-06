import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReceiptEntity } from "./entities/receipt.entity";
import { PaymentEntity } from "../payments/entities/payment.entity";
import { BookingEntity } from "../bookings/entities/booking.entity";
import { ReceiptsService } from "./receipts.service";
import { ReceiptsController } from "./receipts.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReceiptEntity,
      PaymentEntity,
      BookingEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
