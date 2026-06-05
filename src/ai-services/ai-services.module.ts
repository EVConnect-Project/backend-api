import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AiServicesClient } from "./ai-services.client";

@Module({
  imports: [HttpModule],
  providers: [AiServicesClient],
  exports: [AiServicesClient],
})
export class AiServicesModule {}
