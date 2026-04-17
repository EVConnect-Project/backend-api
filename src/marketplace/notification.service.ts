import { Injectable, Logger } from "@nestjs/common";
import { MarketplaceListing } from "./entities/marketplace-listing.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/types/notification-types";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Notify seller when their listing is approved
   */
  async notifyListingApproved(listing: MarketplaceListing): Promise<void> {
    this.logger.log("=".repeat(60));
    this.logger.log("📧 NOTIFICATION: Listing Approved");
    this.logger.log("=".repeat(60));
    this.logger.log(`Listing ID: ${listing.id}`);
    this.logger.log(`Title: ${listing.title}`);
    this.logger.log(`Seller: ${listing.seller?.name || "Unknown"}`);
    this.logger.log(`Seller Phone: ${listing.seller?.phoneNumber || "N/A"}`);
    this.logger.log(`Status: ${listing.status}`);
    this.logger.log(
      `Message: Congratulations! Your listing "${listing.title}" has been approved and is now visible in the marketplace.`,
    );
    this.logger.log("=".repeat(60));

    // Send push notification to seller
    if (listing.seller?.id) {
      try {
        await this.notificationsService.sendToUser(
          listing.seller.id,
          NotificationType.LISTING_APPROVED,
          {
            title: "✅ Listing Approved",
            body: `Your listing "${listing.title}" has been approved and is now live in the marketplace!`,
            data: {
              listingId: listing.id,
              type: "listing_approved",
              action: "view_listing",
            },
          },
        );
        this.logger.log(
          `✅ Push notification sent to seller ${listing.seller.id}`,
        );
      } catch (error) {
        this.logger.error("Failed to send push notification:", error);
      }
    }
  }

  /**
   * Notify seller when their listing is rejected
   */
  async notifyListingRejected(
    listing: MarketplaceListing,
    reason: string,
  ): Promise<void> {
    this.logger.log("=".repeat(60));
    this.logger.log("📧 NOTIFICATION: Listing Rejected");
    this.logger.log("=".repeat(60));
    this.logger.log(`Listing ID: ${listing.id}`);
    this.logger.log(`Title: ${listing.title}`);
    this.logger.log(`Seller: ${listing.seller?.name || "Unknown"}`);
    this.logger.log(`Seller Phone: ${listing.seller?.phoneNumber || "N/A"}`);
    this.logger.log(`Status: ${listing.status}`);
    this.logger.log(`Reason: ${reason}`);
    this.logger.log(
      `Message: Your listing "${listing.title}" was not approved. Please review the feedback and resubmit.`,
    );
    this.logger.log("=".repeat(60));

    // Send push notification to seller
    if (listing.seller?.id) {
      try {
        await this.notificationsService.sendToUser(
          listing.seller.id,
          NotificationType.LISTING_REJECTED,
          {
            title: "❌ Listing Not Approved",
            body: `Your listing "${listing.title}" was not approved. Reason: ${reason}`,
            data: {
              listingId: listing.id,
              type: "listing_rejected",
              reason,
              action: "view_my_listings",
            },
          },
        );
        this.logger.log(
          `✅ Push notification sent to seller ${listing.seller.id}`,
        );
      } catch (error) {
        this.logger.error("Failed to send push notification:", error);
      }
    }
  }
}
