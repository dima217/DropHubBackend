import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChannelMember } from './channel-member.entity';
import { Message } from './message.entity';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'direct' | 'group';

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'room_id', type: 'varchar', nullable: true, unique: true })
  roomId: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ChannelMember, (member) => member.channel)
  members: ChannelMember[];

  @OneToMany(() => Message, (message) => message.channel)
  messages: Message[];
}
