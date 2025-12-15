import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleProfile } from './entities/vehicle-profile.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehicleProfileService {
  private readonly logger = new Logger(VehicleProfileService.name);

  constructor(
    @InjectRepository(VehicleProfile)
    private vehicleProfileRepository: Repository<VehicleProfile>,
  ) {}

  async findAllByUser(userId: string): Promise<VehicleProfile[]> {
    try {
      this.logger.debug(`Finding all vehicles for user: ${userId}`);
      
      const vehicles = await this.vehicleProfileRepository.find({
        where: { userId },
        order: { isPrimary: 'DESC', createdAt: 'DESC' },
      });
      
      this.logger.debug(`Found ${vehicles.length} vehicles for user ${userId}`);
      return vehicles;
    } catch (error) {
      this.logger.error(`Error finding vehicles for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
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
    try {
      this.logger.log(`Creating vehicle for user ${userId}: ${JSON.stringify(createVehicleDto)}`);
      
      // Check if this is the first vehicle - make it primary automatically
      const existingVehicles = await this.vehicleProfileRepository.count({ where: { userId } });
      const isPrimary = existingVehicles === 0;

      this.logger.log(`Existing vehicles: ${existingVehicles}, Setting isPrimary: ${isPrimary}`);

      const vehicle = this.vehicleProfileRepository.create({
        userId,
        isPrimary,
        make: createVehicleDto.make,
        model: createVehicleDto.model,
        year: createVehicleDto.year,
        batteryCapacity: createVehicleDto.batteryCapacity,
        connectorType: createVehicleDto.connectorType,
        vehicleType: createVehicleDto.vehicleType,
        maxAcChargingPower: createVehicleDto.maxAcChargingPower,
        maxDcChargingPower: createVehicleDto.maxDcChargingPower,
        rangeKm: createVehicleDto.rangeKm,
        averageConsumption: createVehicleDto.averageConsumption,
        efficiency: createVehicleDto.efficiency,
        chargingCurve: createVehicleDto.chargingCurve as any,
        drivingMode: createVehicleDto.drivingMode,
      });

      const saved = await this.vehicleProfileRepository.save(vehicle);
      this.logger.log(`Vehicle created successfully with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating vehicle: ${error.message}`, error.stack);
      throw error;
    }
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
