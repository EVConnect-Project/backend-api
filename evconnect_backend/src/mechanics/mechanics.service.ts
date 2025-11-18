import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MechanicEntity } from './entities/mechanic.entity';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
  ) {}

  async register(createMechanicDto: CreateMechanicDto): Promise<MechanicEntity> {
    const mechanic = this.mechanicRepository.create(createMechanicDto);
    return this.mechanicRepository.save(mechanic);
  }

  async findAll(): Promise<MechanicEntity[]> {
    return this.mechanicRepository.find({
      where: { available: true },
      order: { rating: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MechanicEntity> {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });

    if (!mechanic) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }

    return mechanic;
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<any[]> {
    try {
      // Get all available mechanics
      const allMechanics = await this.mechanicRepository.find({
        where: { available: true },
        order: { rating: 'DESC' },
      });
      
      // Calculate distance manually for each mechanic
      const mechanicsWithDistance = allMechanics
        .map(mechanic => ({
          id: mechanic.id,
          userId: mechanic.userId,
          name: mechanic.name,
          services: mechanic.services,
          lat: parseFloat(mechanic.lat as any),
          lng: parseFloat(mechanic.lng as any),
          rating: parseFloat(mechanic.rating as any),
          phone: mechanic.phone,
          email: mechanic.email,
          description: mechanic.description,
          available: mechanic.available,
          pricePerHour: mechanic.pricePerHour ? parseFloat(mechanic.pricePerHour as any) : null,
          distance: this.calculateDistance(lat, lng, parseFloat(mechanic.lat as any), parseFloat(mechanic.lng as any)),
        }))
        .filter(m => m.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      return mechanicsWithDistance;
    } catch (error) {
      console.error('Error finding nearby mechanics:', error);
      console.error('Error details:', error.message);
      return [];
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async findByService(service: string): Promise<MechanicEntity[]> {
    return this.mechanicRepository
      .createQueryBuilder('mechanic')
      .where(':service = ANY(mechanic.services)', { service })
      .andWhere('mechanic.available = true')
      .orderBy('mechanic.rating', 'DESC')
      .getMany();
  }

  async update(id: string, updateMechanicDto: UpdateMechanicDto): Promise<MechanicEntity> {
    const mechanic = await this.findOne(id);
    Object.assign(mechanic, updateMechanicDto);
    return this.mechanicRepository.save(mechanic);
  }

  async remove(id: string): Promise<void> {
    const mechanic = await this.findOne(id);
    await this.mechanicRepository.remove(mechanic);
  }

  async updateRating(id: string, newRating: number): Promise<MechanicEntity> {
    const mechanic = await this.findOne(id);
    
    // Simple average (in production, you'd maintain a count of reviews)
    mechanic.rating = parseFloat(((mechanic.rating + newRating) / 2).toFixed(2));
    
    return this.mechanicRepository.save(mechanic);
  }
}
