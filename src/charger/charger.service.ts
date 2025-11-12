import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from './entities/charger.entity';
import { CreateChargerDto } from './dto/create-charger.dto';
import { UpdateChargerDto } from './dto/update-charger.dto';

@Injectable()
export class ChargerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  async create(createChargerDto: CreateChargerDto, ownerId: string): Promise<Charger> {
    const charger = this.chargerRepository.create({
      ...createChargerDto,
      ownerId,
    });
    return this.chargerRepository.save(charger);
  }

  async findAll(): Promise<Charger[]> {
    return this.chargerRepository.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Charger> {
    const charger = await this.chargerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!charger) {
      throw new NotFoundException(`Charger with ID ${id} not found`);
    }

    return charger;
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<Charger[]> {
    // Simple distance calculation using Haversine formula
    // For production, consider using PostGIS extension for better performance
    const query = `
      SELECT *, 
        ( 6371 * acos( 
          cos( radians($1) ) * 
          cos( radians(lat) ) * 
          cos( radians(lng) - radians($2) ) + 
          sin( radians($1) ) * 
          sin( radians(lat) ) 
        ) ) AS distance 
      FROM chargers 
      HAVING distance < $3 
      ORDER BY distance
    `;

    return this.chargerRepository.query(query, [lat, lng, radiusKm]);
  }

  async update(id: string, updateChargerDto: UpdateChargerDto, userId: string): Promise<Charger> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own chargers');
    }

    Object.assign(charger, updateChargerDto);
    return this.chargerRepository.save(charger);
  }

  async remove(id: string, userId: string): Promise<void> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own chargers');
    }

    await this.chargerRepository.remove(charger);
  }

  async findByOwner(ownerId: string): Promise<Charger[]> {
    return this.chargerRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }
}
