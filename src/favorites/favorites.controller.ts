import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FavoritesService } from "./favorites.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  findAll(@Request() req) {
    return this.favoritesService.findAll(req.user.userId);
  }

  @Post(":chargerId")
  add(@Param("chargerId") chargerId: string, @Request() req) {
    return this.favoritesService.add(req.user.userId, chargerId);
  }

  @Delete(":chargerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("chargerId") chargerId: string, @Request() req) {
    return this.favoritesService.remove(req.user.userId, chargerId);
  }

  @Get("check/:chargerId")
  async checkFavorite(@Param("chargerId") chargerId: string, @Request() req) {
    const isFavorite = await this.favoritesService.isFavorite(
      req.user.userId,
      chargerId,
    );
    return { isFavorite };
  }
}
