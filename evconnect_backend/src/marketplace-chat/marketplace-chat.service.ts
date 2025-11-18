import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceChat } from './entities/marketplace-chat.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MarketplaceChatService {
  constructor(
    @InjectRepository(MarketplaceChat)
    private chatRepository: Repository<MarketplaceChat>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * Create or get existing chat thread
   */
  async createChat(dto: CreateChatDto, buyerId: string): Promise<MarketplaceChat> {
    // Check if chat already exists
    const existingChat = await this.chatRepository.findOne({
      where: {
        listingId: dto.listingId,
        buyerId: buyerId,
        sellerId: dto.sellerId,
      },
      relations: ['listing', 'buyer', 'seller'],
    });

    if (existingChat) {
      return existingChat;
    }

    // Prevent seller from chatting with themselves
    if (buyerId === dto.sellerId) {
      throw new BadRequestException('You cannot chat with yourself');
    }

    // Create new chat
    const chat = this.chatRepository.create({
      listingId: dto.listingId,
      buyerId: buyerId,
      sellerId: dto.sellerId,
    });

    const savedChat = await this.chatRepository.save(chat);

    const newChat = await this.chatRepository.findOne({
      where: { id: savedChat.id },
      relations: ['listing', 'buyer', 'seller'],
    });

    if (!newChat) {
      throw new NotFoundException('Failed to create chat');
    }

    return newChat;
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string): Promise<MarketplaceChat[]> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.listing', 'listing')
      .leftJoinAndSelect('chat.buyer', 'buyer')
      .leftJoinAndSelect('chat.seller', 'seller')
      .where('chat.buyerId = :userId OR chat.sellerId = :userId', { userId })
      .orderBy('chat.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('chat.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get chat by ID (with permission check)
   */
  async getChatById(chatId: string, userId: string): Promise<MarketplaceChat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['listing', 'buyer', 'seller'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user is participant
    if (chat.buyerId !== userId && chat.sellerId !== userId) {
      throw new ForbiddenException('You are not a participant in this chat');
    }

    return chat;
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(dto: SendMessageDto, senderId: string): Promise<ChatMessage> {
    // Verify chat exists and user is participant
    const chat = await this.getChatById(dto.chatId, senderId);

    // Create message
    const message = this.messageRepository.create({
      chatId: dto.chatId,
      senderId: senderId,
      message: dto.message,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update chat's last message info
    chat.lastMessage = dto.message;
    chat.lastMessageAt = new Date();
    await this.chatRepository.save(chat);

    // Return message with sender info
    const messageWithSender = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });

    if (!messageWithSender) {
      throw new NotFoundException('Failed to retrieve sent message');
    }

    return messageWithSender;
  }

  /**
   * Get all messages for a chat
   */
  async getChatMessages(chatId: string, userId: string): Promise<ChatMessage[]> {
    // Verify user has access to this chat
    await this.getChatById(chatId, userId);

    const messages = await this.messageRepository.find({
      where: { chatId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    // Mark messages as read for the recipient
    await this.messageRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('chatId = :chatId', { chatId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    return messages;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Get all chats for user
    const chats = await this.chatRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
    });

    const chatIds = chats.map((chat) => chat.id);

    if (chatIds.length === 0) {
      return 0;
    }

    // Count unread messages where user is NOT the sender
    const count = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId IN (:...chatIds)', { chatIds })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.isRead = :isRead', { isRead: false })
      .getCount();

    return count;
  }
}
