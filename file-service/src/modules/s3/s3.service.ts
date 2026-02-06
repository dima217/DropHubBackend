import { Injectable, OnModuleInit } from "@nestjs/common";
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

@Injectable()
export class S3Service implements OnModuleInit {
  public client: S3Client;

  onModuleInit() {
    const endpoint = process.env.S3_ENDPOINT || "";
    const isHttps = endpoint.startsWith("https://");

    const requestHandlerConfig: any = {
      requestTimeout: 15000,
    };

    if (isHttps) {
      requestHandlerConfig.httpsAgent = new https.Agent({ maxSockets: 50 });
    } else {
      requestHandlerConfig.httpAgent = new http.Agent({ maxSockets: 50 });
    }

    this.client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: endpoint,
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
