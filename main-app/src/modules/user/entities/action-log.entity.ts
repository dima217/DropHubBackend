import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', length: 16 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int' })
  durationMs: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  query: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  body: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
