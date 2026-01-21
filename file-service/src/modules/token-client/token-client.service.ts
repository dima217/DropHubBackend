import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface TokenPayload {
  tokenId: string;
  resourceId: string;
  resourceType: 'file' | 'room' | 'storage' | 'invite';
  role: 'R' | 'RW';
  exp: number;
}

@Injectable()
export class TokenClientService {
  constructor(@Inject('TOKEN_SERVICE') private readonly tokenClient: ClientProxy) {}

  async validateToken(token: string): Promise<TokenPayload> {
    return firstValueFrom(this.tokenClient.send('token.validate', { token }));
  }
}
