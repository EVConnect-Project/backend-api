import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { Server, Socket } from "socket.io";
import { TripPlanEntity } from "./entities/trip-plan.entity";

interface TripLocationPayload {
  tripId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  timestamp?: string;
}

interface LiveTripLocation {
  tripId: string;
  userId: string;
  lat: number;
  lng: number;
  heading: number;
  speedKph: number;
  timestamp: string;
}

@WebSocketGateway({
  namespace: "/trip",
  cors: {
    origin: "*",
    credentials: true,
  },
})
@Injectable()
export class TripGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TripGateway.name);
  private readonly latestTripLocation = new Map<string, LiveTripLocation>();
  private readonly staleTripIds = new Set<string>();
  private staleHeartbeatInterval: NodeJS.Timeout | null = null;
  private staleHeartbeatDisabled = false;
  private static readonly STALE_HEARTBEAT_SECONDS = 45;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(TripPlanEntity)
    private readonly tripPlanRepository: Repository<TripPlanEntity>,
  ) {}

  async onModuleInit() {
    const hasTripPlansTable = await this.checkTripPlansTableExists();
    if (!hasTripPlansTable) {
      this.staleHeartbeatDisabled = true;
      this.logger.warn(
        'TripGateway stale heartbeat loop disabled: table "trip_plans" not found in current database.',
      );
      return;
    }

    this.staleHeartbeatInterval = setInterval(() => {
      this.checkAndBroadcastStaleTrips().catch((error) => {
        if (this.isMissingTripPlansTableError(error)) {
          this.staleHeartbeatDisabled = true;
          if (this.staleHeartbeatInterval) {
            clearInterval(this.staleHeartbeatInterval);
            this.staleHeartbeatInterval = null;
          }
          this.logger.warn(
            'TripGateway stale heartbeat loop disabled: table "trip_plans" no longer available.',
          );
          return;
        }
        this.logger.error(`Stale heartbeat check failed: ${String(error)}`);
      });
    }, 15000);
  }

  onModuleDestroy() {
    if (this.staleHeartbeatInterval) {
      clearInterval(this.staleHeartbeatInterval);
      this.staleHeartbeatInterval = null;
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Trip socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Trip socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinTrip")
  async handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId || !data?.tripId) {
      client.emit("tripError", { message: "Unauthorized or invalid tripId" });
      return;
    }

    const trip = await this.tripPlanRepository.findOne({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      client.emit("tripError", { message: "Trip not found" });
      return;
    }

    const room = this.getTripRoom(data.tripId);
    await client.join(room);

    const latestLocation =
      this.latestTripLocation.get(data.tripId) ??
      (trip.currentLat != null && trip.currentLng != null
        ? {
            tripId: trip.id,
            userId,
            lat: Number(trip.currentLat),
            lng: Number(trip.currentLng),
            heading: Number(trip.currentHeading ?? 0),
            speedKph: Number(trip.currentSpeedKph ?? 0),
            timestamp: (trip.lastLocationAt ?? trip.updatedAt).toISOString(),
          }
        : null);
    const heartbeatAgeSeconds = trip.lastLocationAt
      ? Math.max(
          0,
          Math.floor((Date.now() - trip.lastLocationAt.getTime()) / 1000),
        )
      : null;
    const isStale =
      heartbeatAgeSeconds != null
        ? heartbeatAgeSeconds > TripGateway.STALE_HEARTBEAT_SECONDS
        : true;

    client.emit("tripJoined", {
      tripId: data.tripId,
      room,
      status: trip.status,
      latestLocation: latestLocation ?? null,
      isStale,
      heartbeatAgeSeconds,
    });

    this.logger.log(`User ${userId} joined trip room ${room}`);
  }

  @SubscribeMessage("locationUpdate")
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TripLocationPayload,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId || !data?.tripId) {
      client.emit("tripError", { message: "Unauthorized or invalid payload" });
      return;
    }

    const trip = await this.tripPlanRepository.findOne({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      client.emit("tripError", { message: "Trip not found" });
      return;
    }

    const location: LiveTripLocation = {
      tripId: data.tripId,
      userId,
      lat: data.lat,
      lng: data.lng,
      heading: Number.isFinite(data.heading) ? Number(data.heading) : 0,
      speedKph: Number.isFinite(data.speedKph) ? Number(data.speedKph) : 0,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    this.latestTripLocation.set(data.tripId, location);
    this.staleTripIds.delete(data.tripId);

    await this.tripPlanRepository.update(
      { id: data.tripId, userId },
      {
        currentLat: location.lat,
        currentLng: location.lng,
        currentHeading: location.heading,
        currentSpeedKph: location.speedKph,
        lastLocationAt: new Date(location.timestamp),
      },
    );

    this.server
      .to(this.getTripRoom(data.tripId))
      .emit("locationUpdate", location);
    client.emit("locationAck", {
      tripId: data.tripId,
      timestamp: location.timestamp,
    });
  }

  @SubscribeMessage("tripEnded")
  async handleTripEnded(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId || !data?.tripId) {
      client.emit("tripError", { message: "Unauthorized or invalid tripId" });
      return;
    }

    const trip = await this.tripPlanRepository.findOne({
      where: { id: data.tripId, userId },
    });

    if (!trip) {
      client.emit("tripError", { message: "Trip not found" });
      return;
    }

    if (trip.status !== "completed") {
      trip.status = "completed";
      await this.tripPlanRepository.save(trip);
    }

    this.server.to(this.getTripRoom(data.tripId)).emit("tripEnded", {
      tripId: data.tripId,
      status: "completed",
      timestamp: new Date().toISOString(),
    });

    this.latestTripLocation.delete(data.tripId);
    this.staleTripIds.delete(data.tripId);
  }

  private async checkAndBroadcastStaleTrips(): Promise<void> {
    if (this.staleHeartbeatDisabled) return;

    const activeTrips = await this.tripPlanRepository.find({
      where: { status: "active" },
    });
    const now = Date.now();

    for (const trip of activeTrips) {
      const heartbeatAgeSeconds = trip.lastLocationAt
        ? Math.max(0, Math.floor((now - trip.lastLocationAt.getTime()) / 1000))
        : null;
      const isStale =
        heartbeatAgeSeconds != null
          ? heartbeatAgeSeconds > TripGateway.STALE_HEARTBEAT_SECONDS
          : true;

      if (isStale && !this.staleTripIds.has(trip.id)) {
        this.server.to(this.getTripRoom(trip.id)).emit("tripStale", {
          tripId: trip.id,
          isStale: true,
          heartbeatAgeSeconds,
        });
        this.staleTripIds.add(trip.id);
        continue;
      }

      if (!isStale && this.staleTripIds.has(trip.id)) {
        this.server.to(this.getTripRoom(trip.id)).emit("tripStale", {
          tripId: trip.id,
          isStale: false,
          heartbeatAgeSeconds,
        });
        this.staleTripIds.delete(trip.id);
      }
    }
  }

  private getTripRoom(tripId: string): string {
    return `trip:${tripId}`;
  }

  private async checkTripPlansTableExists(): Promise<boolean> {
    try {
      const tablePath = this.tripPlanRepository.metadata.tablePath;
      await this.tripPlanRepository.query(`SELECT 1 FROM ${tablePath} LIMIT 1`);
      return true;
    } catch (error) {
      if (this.isMissingTripPlansTableError(error)) {
        return false;
      }
      this.logger.error(`TripGateway table check failed: ${String(error)}`);
      return false;
    }
  }

  private isMissingTripPlansTableError(error: unknown): boolean {
    const message = String(error).toLowerCase();
    return (
      message.includes('relation "trip_plans" does not exist') ||
      message.includes("relation 'trip_plans' does not exist") ||
      message.includes("no such table")
    );
  }

  private getUserIdFromSocket(client: Socket): string | null {
    try {
      const rawAuth =
        client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!rawAuth || typeof rawAuth !== "string") return null;

      const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : rawAuth;
      const payload = this.jwtService.verify(token);

      return payload.userId || payload.sub || null;
    } catch {
      return null;
    }
  }
}
