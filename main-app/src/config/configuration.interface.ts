import { IsString, IsInt, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PostgresConfig {
  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  database: string;
}

export class RedisConfig {
  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  @IsOptional()
  password?: string;
}

export class SwaggerConfig {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  version: string;

  @IsString()
  path: string;

  @IsBoolean()
  enable: boolean;
}

export class AppConfig {
  @IsString()
  environment: string;

  @IsInt()
  port: number;

  @ValidateNested()
  @Type(() => PostgresConfig)
  postgres: PostgresConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis: RedisConfig;

  @ValidateNested()
  @Type(() => SwaggerConfig)
  swagger: SwaggerConfig;
}
