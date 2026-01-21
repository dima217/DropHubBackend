import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { MAX_DOWNLOAD_SIZE } from '../../../constants/interfaces';
import { Injectable, Inject } from '@nestjs/common';
import { S3Service } from '../../s3/s3.service';
import { S3_BUCKET_TOKEN } from '../../s3/s3.tokens';

@Injectable()
export class S3ReadStream {
  private fileSize: number | null = null;

  constructor(
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string,
    private readonly s3Service: S3Service,
  ) {}

  private async fetchFileSize(key: string) {
    if (this.fileSize !== null) return this.fileSize;

    const head = await this.s3Service.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    this.fileSize = head.ContentLength ?? 0;
    return this.fileSize;
  }

  async download(key: string): Promise<Readable> {
    const fileSize = await this.fetchFileSize(key);

    if (fileSize <= MAX_DOWNLOAD_SIZE) {
      const { Body } = await this.s3Service.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return Body as Readable;
    }

    const chunkSize = MAX_DOWNLOAD_SIZE;
    let offset = 0;

    const stream = new Readable({
      read: async () => {
        if (offset >= fileSize) {
          stream.push(null);
          return;
        }

        const end = Math.min(offset + chunkSize - 1, fileSize - 1);
        const { Body } = await this.s3Service.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Range: `bytes=${offset}-${end}`,
          }),
        );

        for await (const chunk of Body as Readable) {
          stream.push(chunk);
        }

        offset += chunkSize;
      },
    });

    return stream;
  }
}

