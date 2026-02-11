import { Readable } from "stream";
import { ResourceType } from "../../permission-client/permission-client.service";

export interface IDownloadService {
  getDownloadLinksAuthenticated(params: {
    fileIds: string[];
    userId: number;
    resourceType: ResourceType;
    resourceId: string;
  }): Promise<{ fileId: string; url: string }[]>;
  downloadFileByToken(params: { downloadToken: string }): Promise<string>;
  getStream(key: string): Promise<Readable>;
  invalidateDownloadCache(key: string): Promise<void>;
}
