import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
} from "@nestjs/common";
import { MarketplaceChatService } from "./marketplace-chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("marketplace-chat")
@UseGuards(JwtAuthGuard)
export class MarketplaceChatController {
  constructor(private readonly chatService: MarketplaceChatService) {}

  @Post("create")
  createChat(@Body(ValidationPipe) dto: CreateChatDto, @Request() req) {
    return this.chatService.createChat(dto, req.user.userId);
  }

  @Get("my-chats")
  getUserChats(@Request() req) {
    return this.chatService.getUserChats(req.user.userId);
  }

  @Get("chat/:chatId")
  getChatById(@Param("chatId") chatId: string, @Request() req) {
    return this.chatService.getChatById(chatId, req.user.userId);
  }

  @Post("send-message")
  sendMessage(@Body(ValidationPipe) dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(dto, req.user.userId);
  }

  @Get("messages/:chatId")
  getChatMessages(@Param("chatId") chatId: string, @Request() req) {
    return this.chatService.getChatMessages(chatId, req.user.userId);
  }

  @Get("unread-count")
  getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }
}
