import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  ListBucketsCommand,
  Bucket,
  PutObjectCommandInput,
  PutObjectCommand,
  GetObjectCommandInput,
  GetObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  CopyObjectCommandInput,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import http from "http";
import { AppConfig } from "../../config/configuration.interface";

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  public client: S3Client;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    const endpoint = this.configService.get("s3.endpoint", { infer: true });
    const region = this.configService.get("s3.region", { infer: true }) || "us-east-1";
    const accessKeyId = this.configService.get("s3.accessKeyId", { infer: true }) ?? "";
    const secretAccessKey =
      this.configService.get("s3.secretAccessKey", { infer: true }) ?? "";

    const isHttps = endpoint.startsWith("https://");

    this.logger.log(`S3 endpoint: ${endpoint} (path-style, region=${region})`);

    const requestHandlerConfig: {
      requestTimeout: number;
      httpsAgent?: https.Agent;
      httpAgent?: http.Agent;
    } = {
      requestTimeout: 15000,
    };

    if (isHttps) {
      requestHandlerConfig.httpsAgent = new https.Agent({ maxSockets: 50 });
    } else {
      requestHandlerConfig.httpAgent = new http.Agent({ maxSockets: 50 });
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: new NodeHttpHandler(requestHandlerConfig),
    });
  }

  async listBuckets(): Promise<Bucket[] | undefined> {
    try {
      const data = await this.client.send(new ListBucketsCommand({}));
      return data.Buckets;
    } catch (error) {
      throw new Error(`Failed to list buckets: ${(error as Error).message}`);
    }
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async upload(params: PutObjectCommandInput) {
    return this.client.send(new PutObjectCommand(params));
  }

  async copy(params: CopyObjectCommandInput) {
    return this.client.send(new CopyObjectCommand(params));
  }

  async get(params: GetObjectCommandInput) {
    return this.client.send(new GetObjectCommand(params));
  }

  async delete(params: DeleteObjectCommandInput) {
    return this.client.send(new DeleteObjectCommand(params));
  }

  createUploadCommand(params: PutObjectCommandInput): PutObjectCommand {
    return new PutObjectCommand(params);
  }

  createGetResourceCommand(params: GetObjectCommandInput): GetObjectCommand {
    return new GetObjectCommand(params);
  }

  createDeleteCommand(params: DeleteObjectCommandInput): DeleteObjectCommand {
    return new DeleteObjectCommand(params);
  }
}
