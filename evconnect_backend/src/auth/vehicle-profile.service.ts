import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleProfile } from './entities/vehicle-profile.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehicleProfileService {
  constructor(
    @InjectRepository(VehicleProfile)
    private vehicleProfileRepository: Repository<VehicleProfile>,
  ) {}

  async findAllByUser(userId: string): Promise<VehicleProfile[]> {
    return this.vehicleProfileRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<VehicleProfile> {
    const vehicle = await this.vehicleProfileRepository.findOne({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async create(userId: string, createVehicleDto: CreateVehicleDto): Promise<VehicleProfile> {
    // Check if this is the first vehicle - make it primary automatically
    const existingVehicles = await this.vehicleProfileRepository.count({ where: { userId } });
    const isPrimary = existingVehicles === 0;

    const vehicle = this.vehicleProfileRepository.create({
      ...createVehicleDto,
      userId,
      isPrimary,
    });

    return this.vehicleProfileRepository.save(vehicle);
  }

  async update(id: string, userId: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleProfile> {
    const vehicle = await this.findOne(id, userId);

    Object.assign(vehicle, updateVehicleDto);
    return this.vehicleProfileRepository.save(vehicle);
  }

  async remove(id: string, userId: string): Promise<void> {
    const vehicle = await this.findOne(id, userId);
    
    // If deleting the primary vehicle, set another one as primary
    if (vehicle.isPrimary) {
      const otherVehicles = await this.vehicleProfileRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      
      const nextVehicle = otherVehicles.find(v => v.id !== id);
      if (nextVehicle) {
        nextVehicle.isPrimary = true;
        await this.vehicleProfileRepository.save(nextVehicle);
      }
    }

    await this.vehicleProfileRepository.remove(vehicle);
  }

  async setPrimary(id: string, userId: string): Promise<VehicleProfile> {
    const vehicle = await this.findOne(id, userId);

    // Unset all other primary vehicles
    await this.vehicleProfileRepository.update(
      { userId, isPrimary: true },
      { isPrimary: false },
    );

    // Set this one as primary
    vehicle.isPrimary = true;
    return this.vehicleProfileRepository.save(vehicle);
  }
}
