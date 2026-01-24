import { UploadData } from '../interfaces/file-request.interface';

export interface IUploadService {
  uploadFileToRoom(params: UploadData): Promise<{ url: string }>;
  uploadFileToStorage(params: UploadData): Promise<{ url: string }>;
  uploadFileByToken(params: UploadData): Promise<{ url: string }>;
}


