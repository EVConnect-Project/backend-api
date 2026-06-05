import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MechanicEntity } from "../mechanics/entities/mechanic.entity";
import { ServiceStationEntity } from "../service-stations/entities/service-station.entity";
import { ServiceProviderSignalEntity } from "./entities/service-provider-signal.entity";
import { ServiceStationBookingEntity } from "./entities/service-station-booking.entity";
import { ServiceProvidersController } from "./service-providers.controller";
import { ServiceProvidersService } from "./service-providers.service";
import { ServiceStationBookingsService } from "./service-station-bookings.service";
import { AiServicesModule } from "../ai-services/ai-services.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MechanicEntity,
      ServiceStationEntity,
      ServiceProviderSignalEntity,
      ServiceStationBookingEntity,
    ]),
    AiServicesModule,
    NotificationsModule,
  ],
  controllers: [ServiceProvidersController],
  providers: [ServiceProvidersService, ServiceStationBookingsService],
  exports: [ServiceProvidersService, ServiceStationBookingsService],
})
export class ServiceProvidersModule {}
