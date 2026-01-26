import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { IsDate, IsEnum, IsNotEmpty } from 'class-validator';

@Entity()
@Index(['username', 'code', 'type'])
@Index(['username', 'type', 'createdAt'])
export class Code {
  static Types = {
    recovery: 'recovery',
    signup: 'signup',
  } as const;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  code: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @IsDate()
  @IsNotEmpty()
  expirationDate: Date;

  @Column({ type: 'varchar' })
  @IsEnum(Code.Types)
  @IsNotEmpty()
  type: (typeof Code.Types)[keyof typeof Code.Types];
}

export type CodeType = (typeof Code.Types)[keyof typeof Code.Types];
