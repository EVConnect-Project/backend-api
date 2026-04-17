import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Conversation, ConversationType } from "./entities/conversation.entity";
import { Message, MessageType } from "./entities/message.entity";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(
    dto: CreateConversationDto,
    userId: string,
  ): Promise<Conversation> {
    const preferredType = dto.type;
    const fallbackType =
      dto.type === ConversationType.DIRECT
        ? ConversationType.MECHANIC
        : dto.type;

    // Check if conversation already exists
    let conversation = await this.conversationRepo.findOne({
      where: [
        { userId, participantId: dto.participantId, type: preferredType },
        {
          userId: dto.participantId,
          participantId: userId,
          type: preferredType,
        },
        ...(preferredType !== fallbackType
          ? [
              { userId, participantId: dto.participantId, type: fallbackType },
              {
                userId: dto.participantId,
                participantId: userId,
                type: fallbackType,
              },
            ]
          : []),
      ],
      relations: ["user", "participant"],
    });

    if (!conversation) {
      // Create new conversation
      conversation = this.conversationRepo.create({
        type: preferredType,
        userId,
        participantId: dto.participantId,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
      });

      try {
        conversation = await this.conversationRepo.save(conversation);
      } catch (error) {
        // Backward compatibility: some deployed DB schemas may not yet accept `direct` type.
        if (preferredType === ConversationType.DIRECT) {
          conversation.type = fallbackType;
          conversation = await this.conversationRepo.save(conversation);
        } else {
          throw error;
        }
      }

      // Send initial message if provided
      if (dto.initialMessage) {
        await this.sendMessage(
          {
            conversationId: conversation.id,
            content: dto.initialMessage,
            type: MessageType.TEXT,
          },
          userId,
        );
      }
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: [{ userId }, { participantId: userId }],
      relations: ["user", "participant"],
      order: { lastMessageAt: "DESC" },
    });
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ["user", "participant"],
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    // Check if user is participant
    if (
      conversation.userId !== userId &&
      conversation.participantId !== userId
    ) {
      throw new ForbiddenException(
        "Not authorized to access this conversation",
      );
    }

    return conversation;
  }

  /**
   * Send a message
   */
  async sendMessage(dto: SendMessageDto, userId: string): Promise<Message> {
    const conversation = await this.getConversation(dto.conversationId, userId);

    // Create message
    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      senderId: userId,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      imageUrl: dto.imageUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation
    const isUser = conversation.userId === userId;
    await this.conversationRepo.update(conversation.id, {
      lastMessage: dto.content,
      lastMessageAt: new Date(),
      unreadCountUser: isUser
        ? conversation.unreadCountUser
        : conversation.unreadCountUser + 1,
      unreadCountParticipant: isUser
        ? conversation.unreadCountParticipant + 1
        : conversation.unreadCountParticipant,
    });

    // Load sender relation before returning
    const messageWithSender = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: ["sender"],
    });

    if (!messageWithSender) {
      throw new Error("Failed to retrieve saved message");
    }

    return messageWithSender;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    await this.getConversation(conversationId, userId);

    return this.messageRepo.find({
      where: { conversationId },
      relations: ["sender"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    // Update unread messages
    await this.messageRepo.update(
      {
        conversationId,
        senderId:
          conversation.userId === userId
            ? conversation.participantId
            : conversation.userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    // Reset unread count
    const isUser = conversation.userId === userId;
    await this.conversationRepo.update(conversation.id, {
      unreadCountUser: isUser ? 0 : conversation.unreadCountUser,
      unreadCountParticipant: isUser ? conversation.unreadCountParticipant : 0,
    });
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.conversationRepo.find({
      where: [{ userId }, { participantId: userId }],
    });

    return conversations.reduce((total, conv) => {
      return (
        total +
        (conv.userId === userId
          ? conv.unreadCountUser
          : conv.unreadCountParticipant)
      );
    }, 0);
  }
}
