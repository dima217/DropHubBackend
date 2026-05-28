import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
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

/** AWS SDK требует полный URL (http://host:port) */
export function resolveS3Endpoint(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, "");
  const port = process.env.S3_PORT?.trim() || "9000";
  const host = value.includes(":") ? value : `${value}:${port}`;
  return `http://${host}`;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  /** Серверные операции — internal (minio.railway.internal) */
  public client: S3Client;
  /** Presigned URL для клиентов снаружи Railway — S3_PUBLIC_ENDPOINT */
  public presignClient: S3Client;

  onModuleInit() {
    const internalEndpoint = resolveS3Endpoint(process.env.S3_ENDPOINT || "");
    const publicEndpoint = resolveS3Endpoint(
      process.env.S3_PUBLIC_ENDPOINT?.trim() || process.env.S3_ENDPOINT || "",
    );

    this.client = this.createClient(internalEndpoint);
    this.presignClient = this.createClient(publicEndpoint);

    this.logger.log(`S3 endpoint: ${internalEndpoint}`);
    if (publicEndpoint !== internalEndpoint) {
      this.logger.log(`S3 presign endpoint: ${publicEndpoint}`);
    }
  }

  private createClient(endpoint: string): S3Client {
    const isHttps = endpoint.startsWith("https://");
    const requestHandlerConfig: {
      requestTimeout: number;
      connectionTimeout: number;
      httpsAgent?: https.Agent;
      httpAgent?: http.Agent;
    } = {
      requestTimeout: 15000,
      connectionTimeout: 5000,
    };

    if (isHttps) {
      requestHandlerConfig.httpsAgent = new https.Agent({ maxSockets: 50 });
    } else {
      requestHandlerConfig.httpAgent = new http.Agent({ maxSockets: 50 });
    }

    return new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
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
