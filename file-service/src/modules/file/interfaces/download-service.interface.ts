import { Readable } from "stream";

export interface IDownloadService {
  getDownloadLinksAuthenticated(params: {
    fileIds: string[];
    userId: number;
  }): Promise<{ fileId: string; url: string }[]>;
  downloadFileByToken(params: { downloadToken: string }): Promise<string>;
  getStream(key: string): Promise<Readable>;
  invalidateDownloadCache(key: string): Promise<void>;
}
