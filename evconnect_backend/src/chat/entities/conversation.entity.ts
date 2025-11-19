import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Message } from './message.entity';

export enum ConversationType {
  MECHANIC = 'mechanic',
  MARKETPLACE = 'marketplace',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
  })
  type: ConversationType;

  // Participant 1 (usually the customer/user)
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  // Participant 2 (mechanic or seller)
  @Column({ name: 'participant_id' })
  participantId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'participant_id' })
  participant: UserEntity;

  // Optional: linked breakdown request or listing
  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string; // 'breakdown_request', 'listing', etc.

  @Column({ name: 'last_message', type: 'text', nullable: true })
  lastMessage: string;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'unread_count_user', default: 0 })
  unreadCountUser: number;

  @Column({ name: 'unread_count_participant', default: 0 })
  unreadCountParticipant: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
