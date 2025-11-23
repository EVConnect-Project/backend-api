import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from './entities/charger.entity';
import { CreateChargerDto } from './dto/create-charger.dto';
import { UpdateChargerDto } from './dto/update-charger.dto';
import { ChargerIntegrationService } from '../charger-integration/charger-integration.service';

@Injectable()
export class ChargerService {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
    @Inject(forwardRef(() => ChargerIntegrationService))
    private integrationService: ChargerIntegrationService,
  ) {}

  async create(createChargerDto: CreateChargerDto, ownerId: string): Promise<any> {
    const charger = this.chargerRepository.create({
      ...createChargerDto,
      ownerId,
    });
    const savedCharger = await this.chargerRepository.save(charger);
    
    // Auto-generate OCPP credentials for the new charger
    let ocppCredentials: {
      chargeBoxIdentity: string;
      setupInstructions: string;
      wsUrl: string;
    } | null = null;
    
    try {
      ocppCredentials = await this.integrationService.generateOcppCredentials(savedCharger.id);
    } catch (error) {
      console.error('Failed to generate OCPP credentials:', error);
      // Don't fail charger creation if OCPP setup fails
    }
    
    // Reload charger to get updated OCPP fields
    const updatedCharger = await this.findOne(savedCharger.id);
    
    // Return charger with OCPP credentials
    return {
      ...updatedCharger,
      ocppCredentials: ocppCredentials ? {
        chargeBoxIdentity: ocppCredentials.chargeBoxIdentity,
        wsUrl: ocppCredentials.wsUrl,
        setupInstructions: ocppCredentials.setupInstructions,
      } : null,
    };
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
      SELECT * FROM (
        SELECT *, 
          ( 6371 * acos( 
            cos( radians($1) ) * 
            cos( radians(lat) ) * 
            cos( radians(lng) - radians($2) ) + 
            sin( radians($1) ) * 
            sin( radians(lat) ) 
          ) ) AS distance 
        FROM chargers
      ) AS chargers_with_distance
      WHERE distance < $3 
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
    const updatedCharger = await this.chargerRepository.save(charger);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return updatedCharger;
  }

  async remove(id: string, userId: string): Promise<void> {
    const charger = await this.findOne(id);

    // Check if user is the owner
    if (charger.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own chargers');
    }

    await this.chargerRepository.remove(charger);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
  }

  async findByOwner(ownerId: string): Promise<Charger[]> {
    return this.chargerRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update charger status and broadcast the change
   * @param id Charger ID
   * @param newStatus New status value
   * @returns Updated charger
   */
  async updateStatus(id: string, newStatus: 'available' | 'in-use' | 'offline'): Promise<Charger> {
    const charger = await this.findOne(id);
    
    charger.status = newStatus;
    const updatedCharger = await this.chargerRepository.save(charger);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return updatedCharger;
  }
}
