import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceChatController } from './marketplace-chat.controller';
import { MarketplaceChatService } from './marketplace-chat.service';
import { MarketplaceChatGateway } from './marketplace-chat.gateway';
import { MarketplaceChat } from './entities/marketplace-chat.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceChat, ChatMessage]),
    AuthModule,
  ],
  controllers: [MarketplaceChatController],
  providers: [MarketplaceChatService, MarketplaceChatGateway],
  exports: [MarketplaceChatService],
})
export class MarketplaceChatModule {}
