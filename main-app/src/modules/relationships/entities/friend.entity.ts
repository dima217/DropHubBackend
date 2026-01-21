import { User } from 'src/modules/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('friends')
@Index(['userOneId', 'userTwoId'], { unique: true })
export class Friend {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userOneId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userOneId' })
  userOne: User;

  @Column()
  userTwoId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userTwoId' })
  userTwo: User;
}
