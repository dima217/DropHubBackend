import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CentrifugoService {
  constructor(private readonly configService: ConfigService) {}

  async publish(channel: string, data: Record<string, any>) {
    const response = await axios.post(
      `${this.configService.get('centrifugo.apiUrl')}/publish`,
      { channel, data },
      {
        headers: {
          Authorization: `apikey ${this.configService.get('centrifugo.apiKey')}`,
        },
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data;
  }
}
