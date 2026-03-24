import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Channel } from './channel.entity';
import { MessageReaction } from './message-reaction.entity';

@Entity('messages')
@Index(['channelId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @Column({ name: 'sender_id', type: 'varchar' })
  senderId: string;

  @Column({ name: 'sender_type', default: 'user' })
  senderType: 'user' | 'system' | 'bot';

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'content_type', default: 'text' })
  contentType: 'text' | 'system';

  @Column({ name: 'reply_to_id', type: 'varchar', nullable: true })
  replyToId: string | null;

  @Column({ type: 'simple-array', default: '' })
  mentions: string[];

  @Column({ name: 'client_request_id', type: 'varchar', nullable: true })
  clientRequestId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
  deletedBy: string | null;

  @Column({ name: 'pinned_at', type: 'timestamp', nullable: true })
  pinnedAt: Date | null;

  @Column({ name: 'pinned_by', type: 'varchar', nullable: true })
  pinnedBy: string | null;

  @ManyToOne(() => Channel, (channel) => channel.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @ManyToOne(() => Message, (message) => message.replies)
  @JoinColumn({ name: 'reply_to_id' })
  replyTo: Message | null;

  @OneToMany(() => Message, (message) => message.replyTo)
  replies: Message[];

  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  reactions: MessageReaction[];
}
