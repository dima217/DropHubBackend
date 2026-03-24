import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  emoji: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;
}
