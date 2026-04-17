import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FavoritesService } from "./favorites.service";
import { FavoritesController } from "./favorites.controller";
import { FavoriteCharger } from "./entities/favorite.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteCharger])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
