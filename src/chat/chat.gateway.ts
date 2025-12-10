import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove from user sockets
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = data.userId;
    (client as any).userId = userId;

    // Add to user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    console.log(`User ${userId} joined with socket ${client.id}`);
    return { success: true, message: 'Joined successfully' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto & { userId: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(dto, dto.userId);

      // Get conversation to find recipient
      const conversation = await this.chatService.getConversation(
        dto.conversationId,
        dto.userId,
      );

      const recipientId =
        conversation.userId === dto.userId
          ? conversation.participantId
          : conversation.userId;

      // Emit to sender's other devices
      this.emitToUser(dto.userId, 'newMessage', {
        ...message,
        conversationId: dto.conversationId,
      });

      // Emit to recipient
      this.emitToUser(recipientId, 'newMessage', {
        ...message,
        conversationId: dto.conversationId,
      });

      return { success: true, message };
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; isTyping: boolean },
  ) {
    try {
      const conversation = await this.chatService.getConversation(
        data.conversationId,
        data.userId,
      );

      const recipientId =
        conversation.userId === data.userId
          ? conversation.participantId
          : conversation.userId;

      // Emit typing status to recipient
      this.emitToUser(recipientId, 'typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: data.isTyping,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    try {
      await this.chatService.markAsRead(data.conversationId, data.userId);

      // Notify sender that messages were read
      const conversation = await this.chatService.getConversation(
        data.conversationId,
        data.userId,
      );

      const senderId =
        conversation.userId === data.userId
          ? conversation.participantId
          : conversation.userId;

      this.emitToUser(senderId, 'messagesRead', {
        conversationId: data.conversationId,
        readBy: data.userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Emit event to all sockets of a user
   */
  private emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }
}
