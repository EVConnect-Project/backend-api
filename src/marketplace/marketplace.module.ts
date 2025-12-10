import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController, AdminMarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { NotificationService } from './notification.service';
import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { MarketplaceImage } from './entities/marketplace-image.entity';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceListing, MarketplaceImage, UserEntity]),
    AuthModule,
    CloudinaryModule,
    NotificationsModule,
  ],
  controllers: [MarketplaceController, AdminMarketplaceController],
  providers: [MarketplaceService, NotificationService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
