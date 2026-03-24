import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ResourceType } from 'src/modules/permission/entities/permission.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  @Column({ type: 'text' })
  content: string;

  @Column()
  authorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
