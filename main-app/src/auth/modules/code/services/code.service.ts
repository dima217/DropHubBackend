import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Code, CodeType } from '../entity/code.entity';

@Injectable()
export class CodeService {
  constructor(
    @InjectRepository(Code)
    private repository: Repository<Code>,
  ) {}

  async create(code: Code): Promise<Code> {
    const newCode = this.repository.create(code);
    return await this.repository.save(newCode);
  }

  async findByUsernameAndCode(
    username: string,
    code: string,
    type: CodeType,
  ): Promise<Code | null> {
    return await this.repository.findOne({
      where: { username, code, type },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUsernameAndType(username: string, type: CodeType): Promise<Code | null> {
    return await this.repository.findOne({
      where: { username, type },
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUsernameAndType(username: string, type: CodeType): Promise<void> {
    await this.repository.delete({ username, type });
  }
}
