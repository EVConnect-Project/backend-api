import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get or create conversation
   */
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req,
  ) {
    return this.chatService.getOrCreateConversation(dto, req.user.userId);
  }

  /**
   * Get all user's conversations
   */
  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.userId);
  }

  /**
   * Get specific conversation
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req) {
    return this.chatService.getConversation(id, req.user.userId);
  }

  /**
   * Send message (REST endpoint)
   */
  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(dto, req.user.userId);
  }

  /**
   * Get messages for conversation
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Request() req,
  ) {
    return this.chatService.getMessages(
      id,
      req.user.userId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * Mark conversation as read
   */
  @Patch('conversations/:id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    await this.chatService.markAsRead(id, req.user.userId);
    return { success: true };
  }

  /**
   * Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    try {
      console.log('🔍 [ChatController] getUnreadCount called for user:', req.user?.userId);
      console.log('🔍 [ChatController] req.user object:', JSON.stringify(req.user, null, 2));
      
      if (!req.user?.userId) {
        console.error('❌ [ChatController] No userId in request');
        throw new Error('No user ID found in request');
      }
      
      const count = await this.chatService.getUnreadCount(req.user.userId);
      console.log('✅ [ChatController] Unread count retrieved:', count);
      return { count };
    } catch (error) {
      console.error('❌ [ChatController] Error in getUnreadCount:', error.message);
      console.error('❌ [ChatController] Error stack:', error.stack);
      throw error;
    }
  }
}
