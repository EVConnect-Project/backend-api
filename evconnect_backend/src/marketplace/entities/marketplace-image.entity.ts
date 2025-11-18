import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MarketplaceListing } from './marketplace-listing.entity';

@Entity('marketplace_images')
export class MarketplaceImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @ManyToOne(() => MarketplaceListing, (listing) => listing.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: MarketplaceListing;
}
