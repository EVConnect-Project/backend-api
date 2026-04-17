import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MechanicEntity } from "../entities/mechanic.entity";

interface MechanicLocation {
  mechanicId: string;
  lat: number;
  lng: number;
  available: boolean;
  isOnJob: boolean;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: "*", // Configure for production
    credentials: true,
  },
  namespace: "/mechanics",
})
@Injectable()
export class MechanicAvailabilityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MechanicAvailabilityGateway.name);
  private connectedMechanics = new Map<
    string,
    { socketId: string; mechanicId: string }
  >();
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    @InjectRepository(MechanicEntity)
    private mechanicRepository: Repository<MechanicEntity>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from maps and mark mechanic as unavailable in DB
    for (const [mechanicId, value] of this.connectedMechanics.entries()) {
      if (value.socketId === client.id) {
        this.connectedMechanics.delete(mechanicId);
        this.logger.log(
          `Mechanic ${mechanicId} disconnected — marking unavailable`,
        );

        // Mark unavailable in the database so they don't appear in public searches
        try {
          await this.mechanicRepository.update(mechanicId, {
            available: false,
            lastOnlineAt: new Date(),
          });
          this.logger.log(`✅ Mechanic ${mechanicId} marked unavailable in DB`);

          // Broadcast to subscribed users so their map updates in real time
          const mechanic = await this.mechanicRepository.findOne({
            where: { id: mechanicId },
          });
          if (mechanic?.currentLocationLat && mechanic?.currentLocationLng) {
            const room = this.getGeoRoom(
              parseFloat(mechanic.currentLocationLat.toString()),
              parseFloat(mechanic.currentLocationLng.toString()),
            );
            this.server.to(room).emit("mechanic:availability_changed", {
              mechanicId,
              available: false,
              isOnJob: false,
              timestamp: new Date(),
            });
          }
        } catch (err) {
          this.logger.error(
            `Failed to mark mechanic ${mechanicId} unavailable: ${err.message}`,
          );
        }

        break;
      }
    }

    this.connectedUsers.forEach((value, socketId) => {
      if (socketId === client.id) {
        this.connectedUsers.delete(socketId);
      }
    });
  }

  /**
   * Mechanic registers their presence
   */
  @SubscribeMessage("mechanic:register")
  async handleMechanicRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mechanicId: string },
  ) {
    this.logger.log(`Mechanic registered: ${data.mechanicId}`);
    this.connectedMechanics.set(data.mechanicId, {
      socketId: client.id,
      mechanicId: data.mechanicId,
    });

    // Update last online timestamp
    await this.mechanicRepository.update(data.mechanicId, {
      lastOnlineAt: new Date(),
    });

    client.emit("mechanic:registered", { success: true });
  }

  /**
   * User subscribes to mechanic updates in their area
   */
  @SubscribeMessage("user:subscribe_area")
  handleUserSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId: string; lat: number; lng: number; radiusKm: number },
  ) {
    this.logger.log(
      `User ${data.userId} subscribed to area: ${data.lat}, ${data.lng}`,
    );
    this.connectedUsers.set(client.id, data.userId);

    // Join a room for this geographic area
    const room = this.getGeoRoom(data.lat, data.lng);
    client.join(room);

    client.emit("user:subscribed", { success: true, room });
  }

  /**
   * Mechanic updates their location and availability
   */
  @SubscribeMessage("mechanic:update_location")
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MechanicLocation,
  ) {
    try {
      // Update database
      await this.mechanicRepository.update(data.mechanicId, {
        currentLocationLat: data.lat,
        currentLocationLng: data.lng,
        available: data.available,
        isOnJob: data.isOnJob,
        lastOnlineAt: new Date(),
      });

      // Broadcast to users in the area
      const room = this.getGeoRoom(data.lat, data.lng);
      this.server.to(room).emit("mechanic:location_update", {
        mechanicId: data.mechanicId,
        lat: data.lat,
        lng: data.lng,
        available: data.available,
        isOnJob: data.isOnJob,
        timestamp: new Date(),
      });

      client.emit("mechanic:location_updated", { success: true });
    } catch (error) {
      this.logger.error(`Location update failed: ${error.message}`);
      client.emit("mechanic:location_updated", {
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mechanic updates availability status
   */
  @SubscribeMessage("mechanic:update_availability")
  async handleAvailabilityUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { mechanicId: string; available: boolean; isOnJob: boolean },
  ) {
    try {
      const mechanic = await this.mechanicRepository.findOne({
        where: { id: data.mechanicId },
      });

      if (!mechanic) {
        client.emit("mechanic:availability_updated", {
          success: false,
          error: "Mechanic not found",
        });
        return;
      }

      await this.mechanicRepository.update(data.mechanicId, {
        available: data.available,
        isOnJob: data.isOnJob,
        lastOnlineAt: new Date(),
      });

      // Broadcast to users
      if (mechanic.currentLocationLat && mechanic.currentLocationLng) {
        const room = this.getGeoRoom(
          parseFloat(mechanic.currentLocationLat.toString()),
          parseFloat(mechanic.currentLocationLng.toString()),
        );

        this.server.to(room).emit("mechanic:availability_changed", {
          mechanicId: data.mechanicId,
          available: data.available,
          isOnJob: data.isOnJob,
          timestamp: new Date(),
        });
      }

      client.emit("mechanic:availability_updated", { success: true });

      this.logger.log(
        `Mechanic ${data.mechanicId} availability updated: ${data.available}`,
      );
    } catch (error) {
      this.logger.error(`Availability update failed: ${error.message}`);
      client.emit("mechanic:availability_updated", {
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get nearby available mechanics
   */
  @SubscribeMessage("user:get_nearby_mechanics")
  async handleGetNearbyMechanics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; radiusKm: number },
  ) {
    try {
      // Calculate nearby mechanics
      const mechanics = await this.findNearbyAvailableMechanics(
        data.lat,
        data.lng,
        data.radiusKm,
      );

      client.emit("user:nearby_mechanics", {
        success: true,
        mechanics,
        count: mechanics.length,
      });
    } catch (error) {
      this.logger.error(`Get nearby mechanics failed: ${error.message}`);
      client.emit("user:nearby_mechanics", {
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Emergency alert to specific mechanics
   */
  async sendEmergencyAlert(mechanicId: string, alertData: any) {
    const connection = this.connectedMechanics.get(mechanicId);

    if (connection) {
      this.server.to(connection.socketId).emit("emergency:alert", {
        ...alertData,
        priority: "high",
        timestamp: new Date(),
      });

      this.logger.log(`Emergency alert sent to mechanic ${mechanicId}`);
      return true;
    }

    this.logger.warn(
      `Mechanic ${mechanicId} not connected for emergency alert`,
    );
    return false;
  }

  /**
   * Broadcast mechanic status change to all users
   */
  async broadcastMechanicStatusChange(
    mechanicId: string,
    status: { available: boolean; lat?: number; lng?: number },
  ) {
    if (status.lat && status.lng) {
      const room = this.getGeoRoom(status.lat, status.lng);
      this.server.to(room).emit("mechanic:status_changed", {
        mechanicId,
        ...status,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get geographic room identifier for broadcasting
   * Groups locations into ~10km x 10km grid cells
   */
  private getGeoRoom(lat: number, lng: number): string {
    const latCell = Math.floor(lat * 10); // ~11km per 0.1 degree
    const lngCell = Math.floor(lng * 10);
    return `geo_${latCell}_${lngCell}`;
  }

  /**
   * Find nearby available mechanics
   */
  private async findNearbyAvailableMechanics(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<any[]> {
    const mechanics = await this.mechanicRepository
      .createQueryBuilder("mechanic")
      .where("mechanic.available = :available", { available: true })
      .andWhere("mechanic.isOnJob = :isOnJob", { isOnJob: false })
      .andWhere("mechanic.currentLocationLat IS NOT NULL")
      .andWhere("mechanic.currentLocationLng IS NOT NULL")
      .getMany();

    // Filter by distance
    return mechanics
      .map((mechanic) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          parseFloat(mechanic.currentLocationLat.toString()),
          parseFloat(mechanic.currentLocationLng.toString()),
        );

        return {
          mechanicId: mechanic.id,
          name: mechanic.name,
          lat: mechanic.currentLocationLat,
          lng: mechanic.currentLocationLng,
          distance,
          rating: mechanic.rating,
          services: mechanic.services,
          available: mechanic.available,
          isOnJob: mechanic.isOnJob,
        };
      })
      .filter((m) => m.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
