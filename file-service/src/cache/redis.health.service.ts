import { Injectable } from "@nestjs/common";
import { OnModuleInit } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { RedisClientType } from "redis";

@Injectable()
export class RedisHealthService implements OnModuleInit {
  constructor(@Inject('REDIS_CLIENT') private readonly client: RedisClientType) {}

  async onModuleInit() {
    await this.client.ping();
    console.log('[Redis] Ping OK');
  }
}
