export enum FileServiceErrorCode {
  UploadSessionNotFound = 'UPLOAD_SESSION_NOT_FOUND',
  FileNotUploaded = 'FILE_NOT_UPLOADED',
}

export interface FileServiceRpcError {
  code: FileServiceErrorCode;
  message: string;
}
