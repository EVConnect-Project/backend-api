import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  Logger,
  UnauthorizedException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ChargerService } from "./charger.service";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  cors: {
    origin: "*", // Allow all origins for development
    credentials: true,
  },
  namespace: "/chargers",
})
export class ChargersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChargersGateway.name);

  constructor(
    @Inject(forwardRef(() => ChargerService))
    private readonly chargerService: ChargerService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Handle client connection with JWT authentication
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or headers
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: No token provided`);
        client.emit("error", { message: "Authentication token required" });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);

      // Attach user info and initial location to socket
      client.data.user = payload;
      client.data.currentRoom = null;

      this.logger.log(
        `Client connected: ${client.id} (User: ${payload.sub || payload.userId})`,
      );
      const clientCount = this.server.sockets.sockets.size;
      this.logger.log(`Total clients: ${clientCount}`);

      // Send welcome message
      client.emit("connected", {
        message: "Successfully connected to chargers namespace",
        userId: payload.sub || payload.userId,
        timestamp: new Date().toISOString(),
      });

      // Send initial charger data to newly connected client
      this.handleGetChargers(client);
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} rejected: Invalid token - ${error.message}`,
      );
      client.emit("error", { message: "Invalid authentication token" });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    // Leave any rooms the client was in
    if (client.data.currentRoom) {
      client.leave(client.data.currentRoom);
      this.logger.log(
        `Client ${client.id} left room: ${client.data.currentRoom}`,
      );
    }

    this.logger.log(`Client disconnected: ${client.id}`);

    // Safely get client count
    try {
      const clientCount = this.server?.sockets?.sockets?.size || 0;
      this.logger.log(`Total clients: ${clientCount}`);
    } catch (error) {
      this.logger.warn("Could not get client count");
    }
  }

  /**
   * Generate room name based on geographic location
   * Uses a grid system to group nearby locations
   */
  private generateRoomName(
    lat: number,
    lng: number,
    precision: number = 1,
  ): string {
    // Round coordinates to create geographic regions
    // precision=1 creates ~111km x 111km grids
    // precision=0.1 creates ~11km x 11km grids
    const roundedLat = Math.floor(lat / precision) * precision;
    const roundedLng = Math.floor(lng / precision) * precision;
    return `geo_${roundedLat}_${roundedLng}`;
  }

  /**
   * Join client to a geographic room based on their location
   */
  @SubscribeMessage("joinRoom")
  async handleJoinRoom(
    @MessageBody() data: { lat: number; lng: number; radius?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Leave previous room if any
      if (client.data.currentRoom) {
        client.leave(client.data.currentRoom);
        this.logger.log(
          `Client ${client.id} left previous room: ${client.data.currentRoom}`,
        );
      }

      // Generate room name based on location
      const roomName = this.generateRoomName(data.lat, data.lng, 0.5);

      // Join new room
      await client.join(roomName);
      client.data.currentRoom = roomName;
      client.data.location = { lat: data.lat, lng: data.lng };

      this.logger.log(`Client ${client.id} joined room: ${roomName}`);

      // Send confirmation
      client.emit("roomJoined", {
        room: roomName,
        location: { lat: data.lat, lng: data.lng },
        timestamp: new Date().toISOString(),
      });

      // Send chargers in this room
      await this.handleGetNearbyChargers(data, client);
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit("error", {
        message: "Failed to join room",
        error: error.message,
      });
    }
  }

  /**
   * Leave current room
   */
  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    if (client.data.currentRoom) {
      const roomName = client.data.currentRoom;
      client.leave(roomName);
      client.data.currentRoom = null;
      client.data.location = null;

      this.logger.log(`Client ${client.id} left room: ${roomName}`);

      client.emit("roomLeft", {
        room: roomName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle request for all chargers data
   * Client can emit 'getChargers' to request charger list
   */
  @SubscribeMessage("getChargers")
  async handleGetChargers(@ConnectedSocket() client: Socket) {
    try {
      this.logger.log(`Client ${client.id} requested chargers data`);

      const chargers = await this.chargerService.findAll();

      // Emit chargers data to requesting client only
      client.emit("chargersList", {
        success: true,
        data: chargers,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Sent ${chargers.length} chargers to client ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Error fetching chargers: ${error.message}`);

      client.emit("error", {
        success: false,
        message: "Failed to fetch chargers",
        error: error.message,
      });
    }
  }

  /**
   * Handle request for nearby chargers
   */
  @SubscribeMessage("getNearbyChargers")
  async handleGetNearbyChargers(
    @MessageBody() data: { lat: number; lng: number; radius?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `Client ${client.id} requested nearby chargers at (${data.lat}, ${data.lng})`,
      );

      const chargers = await this.chargerService.findNearby(
        data.lat,
        data.lng,
        data.radius || 10,
      );

      client.emit("nearbyChargersList", {
        success: true,
        data: chargers,
        location: { lat: data.lat, lng: data.lng },
        radius: data.radius || 10,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Sent ${chargers.length} nearby chargers to client ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Error fetching nearby chargers: ${error.message}`);

      client.emit("error", {
        success: false,
        message: "Failed to fetch nearby chargers",
        error: error.message,
      });
    }
  }

  /**
   * Broadcast charger update to all connected clients or specific room
   * This method should be called when a charger is created, updated, or deleted
   */
  broadcastChargerUpdate(
    charger: any,
    action: "created" | "updated" | "deleted",
  ) {
    this.logger.log(
      `Broadcasting charger ${action}: ${charger.id || charger.name}`,
    );

    // Determine which room(s) this charger belongs to
    if (charger.lat && charger.lng) {
      const roomName = this.generateRoomName(charger.lat, charger.lng, 0.5);

      // Broadcast to specific room
      this.server.to(roomName).emit("chargerUpdated", {
        action,
        data: charger,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Broadcast sent to room: ${roomName}`);
    } else {
      // Fallback: broadcast to all clients if no location
      this.server.emit("chargerUpdated", {
        action,
        data: charger,
        timestamp: new Date().toISOString(),
      });

      const clientCount = this.server.sockets.sockets.size;
      this.logger.log(`Broadcast sent to ${clientCount} clients (no room)`);
    }
  }

  /**
   * Broadcast charger availability change to relevant room
   */
  broadcastAvailabilityChange(
    chargerId: string,
    available: boolean,
    chargerLocation?: { lat: number; lng: number },
  ) {
    this.logger.log(
      `Broadcasting availability change for charger ${chargerId}: ${available}`,
    );

    const payload = {
      chargerId,
      available,
      timestamp: new Date().toISOString(),
    };

    if (chargerLocation) {
      const roomName = this.generateRoomName(
        chargerLocation.lat,
        chargerLocation.lng,
        0.5,
      );
      this.server.to(roomName).emit("chargerAvailabilityChanged", payload);
      this.logger.log(`Availability broadcast sent to room: ${roomName}`);
    } else {
      // Fallback: broadcast to all
      this.server.emit("chargerAvailabilityChanged", payload);
    }
  }

  /**
   * Broadcast user activity to all connected admin clients
   */
  broadcastUserActivity(
    user: any,
    action:
      | "registered"
      | "statusChanged"
      | "banned"
      | "unbanned"
      | "roleChanged",
  ) {
    this.logger.log(
      `Broadcasting user activity: ${action} for user ${user.id}`,
    );

    this.server.emit("userActivity", {
      action,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isBanned: user.isBanned,
      },
      timestamp: new Date().toISOString(),
    });

    const clientCount = this.server.sockets.sockets.size;
    this.logger.log(`User activity broadcast sent to ${clientCount} clients`);
  }

  /**
   * Send notification to specific client
   */
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.server.sockets.sockets.get(clientId);

    if (client) {
      client.emit(event, data);
      this.logger.log(`Sent ${event} to client ${clientId}`);
    } else {
      this.logger.warn(`Client ${clientId} not found`);
    }
  }

  /**
   * Get total connected clients count
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }
}
