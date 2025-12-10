import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from '../chat/entities/conversation.entity';
import { Message, MessageType } from '../chat/entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class AdminChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Admin initiates a conversation with any user
   */
  async initiateAdminChat(
    adminId: string,
    targetUserId: string,
    initialMessage?: string,
  ): Promise<{ conversation: Conversation; message?: Message }> {
    // Check if conversation already exists
    let conversation = await this.conversationRepo.findOne({
      where: [
        { userId: adminId, participantId: targetUserId, type: ConversationType.DIRECT },
        { userId: targetUserId, participantId: adminId, type: ConversationType.DIRECT },
      ],
      relations: ['user', 'participant'],
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        type: ConversationType.DIRECT,
        userId: adminId,
        participantId: targetUserId,
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    let message: Message | undefined;
    if (initialMessage) {
      message = await this.sendAdminMessage(conversation.id, adminId, initialMessage);
    }

    return { conversation, message };
  }

  /**
   * Send a message as admin with special flag
   */
  async sendAdminMessage(
    conversationId: string,
    adminId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    priority: 'normal' | 'high' | 'urgent' = 'normal',
  ): Promise<Message> {
    const message = this.messageRepo.create({
      conversationId,
      senderId: adminId,
      content,
      type,
      isAdminMessage: true,
      priorityLevel: priority,
    });

    return await this.messageRepo.save(message);
  }

  /**
   * Get all admin conversations
   */
  async getAdminConversations(
    adminId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const [conversations, total] = await this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.participant', 'participant')
      .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
      .where('conversation.userId = :adminId', { adminId })
      .orWhere('conversation.participantId = :adminId', { adminId })
      .orderBy('conversation.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      conversations,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const [messages, total] = await this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Broadcast message to multiple users
   */
  async broadcastMessage(
    adminId: string,
    userIds: string[],
    message: string,
    priority: 'normal' | 'high' | 'urgent' = 'high',
  ): Promise<Message[]> {
    const sentMessages: Message[] = [];

    for (const userId of userIds) {
      const { conversation } = await this.initiateAdminChat(adminId, userId);
      const msg = await this.sendAdminMessage(
        conversation.id,
        adminId,
        message,
        MessageType.TEXT,
        priority,
      );
      sentMessages.push(msg);
    }

    return sentMessages;
  }

  /**
   * Mark conversation as priority
   */
  async setPriority(conversationId: string, priority: 'normal' | 'high' | 'urgent') {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (conversation) {
      conversation.metadata = { ...conversation.metadata, priority };
      await this.conversationRepo.save(conversation);
    }
  }

  /**
   * Get user details for admin chat context
   */
  async getUserContext(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'phone', 'role', 'isBanned', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
