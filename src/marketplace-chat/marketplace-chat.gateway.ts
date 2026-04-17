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
import { UseGuards } from "@nestjs/common";
import { MarketplaceChatService } from "./marketplace-chat.service";
import { SendMessageDto } from "./dto/send-message.dto";

@WebSocketGateway({
  cors: {
    origin: "*", // Configure this properly for production
  },
  namespace: "/marketplace-chat",
})
export class MarketplaceChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(private readonly chatService: MarketplaceChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Extract userId from handshake query (sent by client)
    const userId = client.handshake.query.userId as string;

    if (userId) {
      this.connectedUsers.set(userId, client.id);
      client.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Remove user from connected users
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage("joinChat")
  handleJoinChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`chat:${data.chatId}`);
    console.log(`User ${data.userId} joined chat ${data.chatId}`);

    return { event: "joinedChat", data: { chatId: data.chatId } };
  }

  @SubscribeMessage("leaveChat")
  handleLeaveChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`chat:${data.chatId}`);
    console.log(`User ${data.userId} left chat ${data.chatId}`);

    return { event: "leftChat", data: { chatId: data.chatId } };
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: { chatId: string; message: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const dto: SendMessageDto = {
        chatId: data.chatId,
        message: data.message,
      };

      // Save message to database
      const savedMessage = await this.chatService.sendMessage(dto, data.userId);

      // Broadcast message to all users in the chat room
      this.server.to(`chat:${data.chatId}`).emit("newMessage", {
        chatId: data.chatId,
        message: savedMessage,
      });

      // Get chat to find the recipient
      const chat = await this.chatService.getChatById(data.chatId, data.userId);
      const recipientId =
        chat.buyerId === data.userId ? chat.sellerId : chat.buyerId;

      // Notify recipient if they're online
      this.server.to(`user:${recipientId}`).emit("chatNotification", {
        chatId: data.chatId,
        message: savedMessage,
        sender: savedMessage.sender,
      });

      return { event: "messageSent", data: savedMessage };
    } catch (error) {
      client.emit("error", { message: error.message });
      return { event: "messageError", data: { message: error.message } };
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody() data: { chatId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast typing status to other users in the chat
    client.to(`chat:${data.chatId}`).emit("userTyping", {
      chatId: data.chatId,
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @MessageBody() data: { chatId: string; userId: string },
  ) {
    // Messages are already marked as read when fetching in the service
    // This event can be used for real-time read receipts
    this.server.to(`chat:${data.chatId}`).emit("messagesRead", {
      chatId: data.chatId,
      userId: data.userId,
    });
  }
}
