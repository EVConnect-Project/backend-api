import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { UserEntity } from "../users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, UserEntity]),
    JwtModule.register({}), // Import JwtModule for WsJwtGuard
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
