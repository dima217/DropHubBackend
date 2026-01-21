import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SwaggerConfig {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  version?: string;

  @IsOptional() @IsString()
  path?: string;

  @IsOptional() @IsString()
  enable?: string;
}

export class RedisConfig {
  @IsOptional() @IsString()
  host?: string;

  @IsOptional() @IsInt()
  @Type(() => Number)
  port?: number;

  @IsOptional() @IsString()
  password?: string;
}

export class MongoConfig {
  @IsString()
  uri!: string;
}

export class S3Config {
  @IsOptional() @IsString()
  endpoint?: string;

  @IsOptional() @IsString()
  bucket?: string;

  @IsOptional() @IsString()
  accessKeyId?: string;

  @IsOptional() @IsString()
  secretAccessKey?: string;
}

export class AppConfig {
  @IsString()
  environment!: string;

  @IsInt()
  @Type(() => Number)
  port!: number;

  @ValidateNested()
  @Type(() => MongoConfig)
  mongo!: MongoConfig;

  @ValidateNested()
  @Type(() => S3Config)
  s3!: S3Config;

  @ValidateNested()
  @Type(() => SwaggerConfig)
  swagger!: SwaggerConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;
}
