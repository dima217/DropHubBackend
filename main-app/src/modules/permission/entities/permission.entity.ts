import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum AccessRole {
  ADMIN = 'admin',
  WRITE = 'write',
  READ = 'read',
}

export interface PermissionData {
  role: AccessRole;
  userId: number;
  storageId: string;
  resourceType: ResourceType;
}

export enum ResourceType {
  ROOM = 'room',
  STORAGE = 'storage',
  FILE = 'file',
  SHARED = 'shared',
  INVITE = 'invite',
}

@Entity()
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  resourceType: ResourceType;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AccessRole,
    default: AccessRole.READ,
  })
  role: AccessRole;
}
