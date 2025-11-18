import { Injectable } from '@nestjs/common';
import { MarketplaceListing } from './entities/marketplace-listing.entity';

@Injectable()
export class NotificationService {
  /**
   * Notify seller when their listing is approved
   * TODO: Integrate with email service or push notification service
   */
  async notifyListingApproved(listing: MarketplaceListing): Promise<void> {
    console.log('='.repeat(60));
    console.log('📧 NOTIFICATION: Listing Approved');
    console.log('='.repeat(60));
    console.log(`Listing ID: ${listing.id}`);
    console.log(`Title: ${listing.title}`);
    console.log(`Seller: ${listing.seller?.name || listing.seller?.email || 'Unknown'}`);
    console.log(`Seller Email: ${listing.seller?.email || 'N/A'}`);
    console.log(`Status: ${listing.status}`);
    console.log(`Message: Congratulations! Your listing "${listing.title}" has been approved and is now visible in the marketplace.`);
    console.log('='.repeat(60));
    
    // TODO: Send actual email notification
    // await this.emailService.send({
    //   to: listing.seller.email,
    //   subject: 'Your Listing Has Been Approved',
    //   template: 'listing-approved',
    //   context: {
    //     sellerName: listing.seller.name,
    //     listingTitle: listing.title,
    //     listingUrl: `${process.env.FRONTEND_URL}/marketplace/details/${listing.id}`,
    //   },
    // });
    
    // TODO: Send push notification
    // await this.pushNotificationService.send({
    //   userId: listing.seller.id,
    //   title: 'Listing Approved',
    //   body: `Your listing "${listing.title}" is now live!`,
    //   data: { listingId: listing.id, type: 'listing_approved' },
    // });
  }

  /**
   * Notify seller when their listing is rejected
   * TODO: Integrate with email service or push notification service
   */
  async notifyListingRejected(listing: MarketplaceListing, reason: string): Promise<void> {
    console.log('='.repeat(60));
    console.log('📧 NOTIFICATION: Listing Rejected');
    console.log('='.repeat(60));
    console.log(`Listing ID: ${listing.id}`);
    console.log(`Title: ${listing.title}`);
    console.log(`Seller: ${listing.seller?.name || listing.seller?.email || 'Unknown'}`);
    console.log(`Seller Email: ${listing.seller?.email || 'N/A'}`);
    console.log(`Status: ${listing.status}`);
    console.log(`Reason: ${reason}`);
    console.log(`Message: Your listing "${listing.title}" was not approved. Please review the feedback and resubmit.`);
    console.log('='.repeat(60));
    
    // TODO: Send actual email notification
    // await this.emailService.send({
    //   to: listing.seller.email,
    //   subject: 'Listing Review Update',
    //   template: 'listing-rejected',
    //   context: {
    //     sellerName: listing.seller.name,
    //     listingTitle: listing.title,
    //     reason: reason,
    //     editListingUrl: `${process.env.FRONTEND_URL}/marketplace/my-listings`,
    //   },
    // });
    
    // TODO: Send push notification
    // await this.pushNotificationService.send({
    //   userId: listing.seller.id,
    //   title: 'Listing Needs Review',
    //   body: `Your listing "${listing.title}" requires changes.`,
    //   data: { listingId: listing.id, type: 'listing_rejected', reason },
    // });
  }
}
