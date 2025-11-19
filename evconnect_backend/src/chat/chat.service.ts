import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

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
    // Check if conversation already exists
    let conversation = await this.conversationRepo.findOne({
      where: [
        { userId, participantId: dto.participantId, type: dto.type },
        { userId: dto.participantId, participantId: userId, type: dto.type },
      ],
      relations: ['user', 'participant'],
    });

    if (!conversation) {
      // Create new conversation
      conversation = this.conversationRepo.create({
        type: dto.type,
        userId,
        participantId: dto.participantId,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
      });

      conversation = await this.conversationRepo.save(conversation);

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
      relations: ['user', 'participant'],
      order: { lastMessageAt: 'DESC' },
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
      relations: ['user', 'participant'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant
    if (conversation.userId !== userId && conversation.participantId !== userId) {
      throw new ForbiddenException('Not authorized to access this conversation');
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
      unreadCountUser: isUser ? conversation.unreadCountUser : conversation.unreadCountUser + 1,
      unreadCountParticipant: isUser ? conversation.unreadCountParticipant + 1 : conversation.unreadCountParticipant,
    });

    return savedMessage;
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
      relations: ['sender'],
      order: { createdAt: 'DESC' },
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
        senderId: conversation.userId === userId ? conversation.participantId : conversation.userId,
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
      return total + (conv.userId === userId ? conv.unreadCountUser : conv.unreadCountParticipant);
    }, 0);
  }
}
