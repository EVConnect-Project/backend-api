import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity('marketplace_chats')
export class MarketplaceChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  listingId: string;

  @Column({ type: 'uuid' })
  buyerId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @ManyToOne('MarketplaceListing')
  @JoinColumn({ name: 'listingId' })
  listing: any;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'buyerId' })
  buyer: any;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'sellerId' })
  seller: any;

  @OneToMany('ChatMessage', 'chat')
  messages: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
