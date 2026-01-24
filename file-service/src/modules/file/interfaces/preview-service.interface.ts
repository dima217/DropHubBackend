export interface PreviewParams {
  fileId: string;
  userId: number;
}

export interface IPreviewService {
  getPreviewUrl(
    params: PreviewParams,
  ): Promise<
    | { previewUrl: string; type: 'image' }
    | { previewUrl: string; type: 'video'; size: number }
  >;
  getVideoThumbnailUrl(params: PreviewParams): Promise<{ thumbnailUrl: string }>;
  getVideoStreamUrl(
    params: PreviewParams,
  ): Promise<{ streamUrl: string; size: number }>;
  invalidatePreviewCache(key: string): Promise<void>;
}

