import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Channel } from './channel.entity';

@Entity('channel_members')
@Unique(['channelId', 'userId'])
export class ChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'member_type', default: 'member' })
  memberType: 'member' | 'admin';

  @Column({ type: 'varchar', length: 255, default: 'member' })
  role: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @ManyToOne(() => Channel, (channel) => channel.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;
}
