import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);
      await client.join(`user:${userId}`);
      this.logger.log(
        `User ${userId} connected to notifications (socket: ${client.id})`,
      );
    } else {
      this.logger.warn(`Client connected without userId: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.connectedUsers.delete(userId);
        }
        this.logger.log(`User ${userId} disconnected from notifications (socket: ${client.id})`);
        break;
      }
    }
  }

  /**
   * Emit a new notification to a specific user in real-time.
   * Called from NotificationsService after saving + sending FCM.
   */
  sendNotificationToUser(userId: string, notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any> | null;
    status: string;
    createdAt: Date;
  }) {
    this.server.to(`user:${userId}`).emit('newNotification', notification);
    this.logger.log(`Emitted newNotification to user ${userId}: ${notification.title}`);
  }

  /**
   * Emit updated unread count to user (after read/clear actions)
   */
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { count });
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }
}
