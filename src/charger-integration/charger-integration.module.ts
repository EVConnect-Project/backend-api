import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ChargerIntegrationService } from "./charger-integration.service";
import { ChargerIntegrationController } from "./charger-integration.controller";
import { Charger } from "../charger/entities/charger.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Charger]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [ChargerIntegrationController],
  providers: [ChargerIntegrationService],
  exports: [ChargerIntegrationService],
})
export class ChargerIntegrationModule {}
