import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('read_cursors')
@Unique(['channelId', 'userId'])
export class ReadCursor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
