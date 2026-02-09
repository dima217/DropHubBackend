import { ResourceType } from '@application/permission/entities/permission.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum FavoriteResourceType {
  STORAGE = ResourceType.STORAGE,
  SHARED = ResourceType.SHARED,
}

@Entity()
@Unique(['userId', 'itemId'])
export class FavoriteStorageItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column()
  storageId: string;

  @Column({ nullable: false })
  resourceType: FavoriteResourceType;

  @Column()
  itemId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
