import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  chatId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne('MarketplaceChat', 'messages')
  @JoinColumn({ name: 'chatId' })
  chat: any;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'senderId' })
  sender: any;

  @CreateDateColumn()
  createdAt: Date;
}
