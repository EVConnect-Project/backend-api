import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FavoriteCharger } from "./entities/favorite.entity";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteCharger)
    private favoritesRepository: Repository<FavoriteCharger>,
  ) {}

  async findAll(userId: string): Promise<FavoriteCharger[]> {
    return this.favoritesRepository.find({
      where: { userId },
      relations: ["charger"],
      order: { addedAt: "DESC" },
    });
  }

  async add(userId: string, chargerId: string): Promise<FavoriteCharger> {
    // Check if already exists
    const existing = await this.favoritesRepository.findOne({
      where: { userId, chargerId },
    });

    if (existing) {
      throw new ConflictException("Charger already in favorites");
    }

    const favorite = this.favoritesRepository.create({
      userId,
      chargerId,
    });

    return this.favoritesRepository.save(favorite);
  }

  async remove(userId: string, chargerId: string): Promise<void> {
    const favorite = await this.favoritesRepository.findOne({
      where: { userId, chargerId },
    });

    if (!favorite) {
      throw new NotFoundException("Favorite not found");
    }

    await this.favoritesRepository.remove(favorite);
  }

  async isFavorite(userId: string, chargerId: string): Promise<boolean> {
    const count = await this.favoritesRepository.count({
      where: { userId, chargerId },
    });
    return count > 0;
  }
}
