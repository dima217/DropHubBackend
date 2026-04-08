import { User } from '@application/user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

@Entity()
export class SupportTicket {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'boolean', default: false })
  anonymous: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  anonymousAccessToken?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  details: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;

  @Column({ type: 'text', nullable: true })
  adminResponse?: string | null;

  @Column({ type: 'int', nullable: true })
  respondedByAdminId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
