export enum FileUploadStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  STOPPED = 'stopped',
}

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 10;
export const MAX_DOWNLOAD_SIZE = 1024 * 1024 * 10;
export const UPLOAD_STRATEGY = {
  SINGLE: 'single',
  MULTIPART: 'multipart',
};
