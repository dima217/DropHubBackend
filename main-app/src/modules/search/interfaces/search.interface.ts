export interface SearchFilesPayload {
  roomIds: string[];
  query?: string;
  mimeType?: string;
  mimeTypes?: string[];
  creatorId?: number;
  limit?: number;
  offset?: number;
}

export interface SearchStorageItemsPayload {
  storageIds: string[];
  query?: string;
  tags?: string[];
  creatorId?: number;
  limit?: number;
  offset?: number;
  mimeType?: string;
  mimeTypes?: string[];
}
