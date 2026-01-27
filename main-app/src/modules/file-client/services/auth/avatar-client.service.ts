import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface GetUploadUrlParams {
  userId: string;
  contentType: string;
}

@Injectable()
export class AvatarClientService {
  constructor(@Inject('FILE_SERVICE') private readonly rpcClient: ClientProxy) {}

  async onModuleInit() {
    await this.rpcClient.connect();
  }

  private send<TResponse, TPayload = unknown>(
    pattern: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return firstValueFrom(this.rpcClient.send<TResponse, TPayload>(pattern, payload));
  }

  async getUploadUrl(params: GetUploadUrlParams) {
    return this.send<{ url: string; key: string }>('avatar.getUploadUrl', params);
  }

  async getDownloadUrl(key: string) {
    return this.send<{ url: string }>('avatar.getDownloadUrl', { key });
  }

  async getAvatarsByKeys(keys: string[]) {
    return this.send<{ urls: string[] }>('avatar.getAvatarsByKeys', { keys });
  }

  async getDefaultAvatar(number: number) {
    return this.send<{ url: string }>('avatar.getDefaultAvatar', { number });
  }

  async getAllDefaultAvatars() {
    return this.send<string[]>('avatar.getAllDefaultAvatars', {});
  }
}
