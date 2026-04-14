import { RpcException } from '@nestjs/microservices';

export enum FileServiceErrorCode {
  UploadSessionNotFound = 'UPLOAD_SESSION_NOT_FOUND',
  FileNotUploaded = 'FILE_NOT_UPLOADED',
  StorageQuotaExceeded = 'STORAGE_QUOTA_EXCEEDED',
}

export interface FileServiceRpcError {
  code: FileServiceErrorCode;
  message: string;
}

export function getFileServiceRpcPayload(err: unknown): { code?: string; message?: string } | null {
  if (err instanceof RpcException) {
    const e = err.getError();
    if (e && typeof e === 'object' && 'code' in e) {
      return e as { code?: string; message?: string };
    }
  }
  const nested = (err as { error?: { code?: string; message?: string } }).error;
  if (nested?.code) {
    return nested;
  }
  const response = (err as { response?: { code?: string; message?: string } }).response;
  if (response?.code) {
    return response;
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const o = err as { code?: string; message?: string };
    if (typeof o.code === 'string') {
      return o;
    }
  }
  return null;
}
