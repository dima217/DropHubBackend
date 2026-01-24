import { Readable } from 'stream';

export interface IDownloadService {
  getDownloadLinkAuthenticated(params: {
    fileId: string;
    userId: number;
  }): Promise<string>;
  downloadFileByToken(params: { downloadToken: string }): Promise<string>;
  getStream(key: string): Promise<Readable>;
  invalidateDownloadCache(key: string): Promise<void>;
}

