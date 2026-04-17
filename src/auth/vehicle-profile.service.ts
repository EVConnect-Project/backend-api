import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VehicleProfile } from "./entities/vehicle-profile.entity";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

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
        order: { isPrimary: "DESC", createdAt: "DESC" },
      });

      for (const vehicle of vehicles) {
        vehicle.connectorTypes = this.normalizeConnectorTypes(
          vehicle.connectorTypes,
          vehicle.connectorType,
        );
      }

      this.logger.debug(`Found ${vehicles.length} vehicles for user ${userId}`);
      return vehicles;
    } catch (error) {
      this.logger.error(
        `Error finding vehicles for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<VehicleProfile> {
    const vehicle = await this.vehicleProfileRepository.findOne({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException("Vehicle not found");
    }

    vehicle.connectorTypes = this.normalizeConnectorTypes(
      vehicle.connectorTypes,
      vehicle.connectorType,
    );

    return vehicle;
  }

  async create(
    userId: string,
    createVehicleDto: CreateVehicleDto,
  ): Promise<VehicleProfile> {
    try {
      this.logger.log(
        `Creating vehicle for user ${userId}: ${JSON.stringify(createVehicleDto)}`,
      );
      this.logger.log(`VehicleType received: ${createVehicleDto.vehicleType}`);

      // Check if this is the first vehicle - make it primary automatically
      const existingVehicles = await this.vehicleProfileRepository.count({
        where: { userId },
      });
      const isPrimary = existingVehicles === 0;

      this.logger.log(
        `Existing vehicles: ${existingVehicles}, Setting isPrimary: ${isPrimary}`,
      );

      // Normalize connector types: derive from connectorTypes array or fall back to connectorType string
      const normalizedConnectorTypes = this.normalizeConnectorTypes(
        createVehicleDto.connectorTypes,
        createVehicleDto.connectorType,
      );

      // Parse charging power if provided as strings (legacy mobile app support)
      const maxAcPower =
        typeof createVehicleDto.maxAcChargingPower === "string"
          ? parseFloat(createVehicleDto.maxAcChargingPower as any) || null
          : createVehicleDto.maxAcChargingPower || null;
      const maxDcPower =
        typeof createVehicleDto.maxDcChargingPower === "string"
          ? parseFloat(createVehicleDto.maxDcChargingPower as any) || null
          : createVehicleDto.maxDcChargingPower || null;

      const vehicle = this.vehicleProfileRepository.create({
        userId,
        isPrimary,
        make: createVehicleDto.make,
        model: createVehicleDto.model,
        year: createVehicleDto.year,
        batteryCapacity: createVehicleDto.batteryCapacity,
        connectorType: createVehicleDto.connectorType,
        connectorTypes: normalizedConnectorTypes,
        vehicleType: createVehicleDto.vehicleType || "car",
        maxAcChargingPower: maxAcPower,
        maxDcChargingPower: maxDcPower,
        rangeKm: createVehicleDto.rangeKm,
        averageConsumption: createVehicleDto.averageConsumption,
        efficiency: createVehicleDto.efficiency,
        chargingCurve: createVehicleDto.chargingCurve as any,
        drivingMode: createVehicleDto.drivingMode,
      } as Partial<VehicleProfile>);

      const saved = await this.vehicleProfileRepository.save(vehicle);
      saved.connectorTypes = this.normalizeConnectorTypes(
        saved.connectorTypes,
        saved.connectorType,
      );
      this.logger.log(`Vehicle created successfully with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(
        `Error creating vehicle: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    userId: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleProfile> {
    const vehicle = await this.findOne(id, userId);

    // If connector types are being updated, normalize them
    if (updateVehicleDto.connectorTypes || updateVehicleDto.connectorType) {
      (updateVehicleDto as any).connectorTypes = this.normalizeConnectorTypes(
        updateVehicleDto.connectorTypes,
        updateVehicleDto.connectorType || vehicle.connectorType,
      );
    }

    // Parse charging power if provided as strings (legacy)
    if (updateVehicleDto.maxAcChargingPower !== undefined) {
      (updateVehicleDto as any).maxAcChargingPower =
        typeof updateVehicleDto.maxAcChargingPower === "string"
          ? parseFloat(updateVehicleDto.maxAcChargingPower as any) || null
          : updateVehicleDto.maxAcChargingPower;
    }
    if (updateVehicleDto.maxDcChargingPower !== undefined) {
      (updateVehicleDto as any).maxDcChargingPower =
        typeof updateVehicleDto.maxDcChargingPower === "string"
          ? parseFloat(updateVehicleDto.maxDcChargingPower as any) || null
          : updateVehicleDto.maxDcChargingPower;
    }

    Object.assign(vehicle, updateVehicleDto);
    const saved = await this.vehicleProfileRepository.save(vehicle);
    saved.connectorTypes = this.normalizeConnectorTypes(
      saved.connectorTypes,
      saved.connectorType,
    );
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const vehicle = await this.findOne(id, userId);

    // If deleting the primary vehicle, set another one as primary
    if (vehicle.isPrimary) {
      const otherVehicles = await this.vehicleProfileRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
      });

      const nextVehicle = otherVehicles.find((v) => v.id !== id);
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
    const saved = await this.vehicleProfileRepository.save(vehicle);
    saved.connectorTypes = this.normalizeConnectorTypes(
      saved.connectorTypes,
      saved.connectorType,
    );
    return saved;
  }

  /**
   * Find the primary vehicle for a user (used by compatibility API)
   */
  async findPrimaryByUser(userId: string): Promise<VehicleProfile | null> {
    return this.vehicleProfileRepository.findOne({
      where: { userId, isPrimary: true },
    });
  }

  /**
   * Normalize connector type strings into standard values.
   * Standard values: type2, ccs2, chademo, type1, ccs1, gb_t_ac, gb_t_dc, tesla, three_phase_type2
   */
  private normalizeConnectorTypes(
    connectorTypes?: string[],
    connectorTypeString?: string,
  ): string[] {
    const typeMap: Record<string, string> = {
      ccs2: "ccs2",
      "ccs type 2": "ccs2",
      "ccs2 (dc)": "ccs2",
      ccs: "ccs2",
      type2: "type2",
      "type 2": "type2",
      "type 2 (ac)": "type2",
      "type 2 (mennekes)": "type2",
      mennekes: "type2",
      type1: "type1",
      "type 1": "type1",
      "type 1 (j1772)": "type1",
      type1_j1772: "type1",
      j1772: "type1",
      ccs1: "ccs1",
      "ccs type 1": "ccs1",
      chademo: "chademo",
      tesla: "tesla",
      tesla_nacs: "tesla",
      "tesla supercharger": "tesla",
      nacs: "tesla",
      "gb/t": "gb_t_ac",
      gb_t_ac: "gb_t_ac",
      "gb/t ac": "gb_t_ac",
      gbt: "gb_t_ac",
      gb_t_dc: "gb_t_dc",
      "gb/t dc": "gb_t_dc",
      three_phase_type2: "three_phase_type2",
      "type 2 (3-phase)": "three_phase_type2",
    };

    const normalize = (val: string): string => {
      const lower = val.toLowerCase().trim();
      return typeMap[lower] || lower;
    };

    // If explicit array provided, normalize it
    if (connectorTypes && connectorTypes.length > 0) {
      const normalized = connectorTypes.map(normalize);
      return [...new Set(normalized)]; // deduplicate
    }

    // Fall back to parsing the legacy comma-separated string
    if (connectorTypeString) {
      const parts = connectorTypeString
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const normalized = parts.map(normalize);
      return [...new Set(normalized)];
    }

    return [];
  }
}
