import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MechanicEntity } from "../mechanics/entities/mechanic.entity";
import { ServiceStationEntity } from "../service-stations/entities/service-station.entity";
import { ServiceProviderSignalEntity } from "./entities/service-provider-signal.entity";
import { ServiceProvidersController } from "./service-providers.controller";
import { ServiceProvidersService } from "./service-providers.service";
import { AiServicesModule } from "../ai-services/ai-services.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MechanicEntity,
      ServiceStationEntity,
      ServiceProviderSignalEntity,
    ]),
    AiServicesModule,
  ],
  controllers: [ServiceProvidersController],
  providers: [ServiceProvidersService],
  exports: [ServiceProvidersService],
})
export class ServiceProvidersModule {}
