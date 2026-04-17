import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PromotionsService } from "./promotions.service";
import { PromotionsController } from "./promotions.controller";
import { PromotionEntity } from "./entities/promotion.entity";
import { AdImpressionEntity } from "./entities/ad-impression.entity";
import { AbTestEntity } from "./entities/ab-test.entity";
import { AdRevenueLedgerEntity } from "./entities/ad-revenue-ledger.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionEntity,
      AdImpressionEntity,
      AbTestEntity,
      AdRevenueLedgerEntity,
    ]),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
