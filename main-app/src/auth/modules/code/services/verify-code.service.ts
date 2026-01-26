import { Injectable, Inject } from '@nestjs/common';
import { CodeService } from './code.service';
import { Code, CodeType } from '../entity/code.entity';

@Injectable()
export class VerifyCodeService {
  constructor(
    @Inject()
    private readonly codeRepository: CodeService,
  ) {}

  private generateCodeData(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateCode(username: string, type: CodeType): Promise<Code> {
    await this.codeRepository.deleteByUsernameAndType(username, type);

    const code = this.generateCodeData();

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 10);

    const codeEntity = await this.codeRepository.create({
      id: 0,
      username,
      code,
      type,
      expirationDate,
      createdAt: new Date(),
    });

    return codeEntity;
  }

  async verifyCode(username: string, code: string, type: CodeType): Promise<boolean> {
    const foundCode = await this.codeRepository.findByUsernameAndCode(username, code, type);
    if (!foundCode) {
      return false;
    }

    if (foundCode.expirationDate < new Date()) {
      return false;
    }

    return true;
  }
}
