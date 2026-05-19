export type OptimisticUploadStatus = "queued" | "uploading" | "processing" | "complete" | "failed";

export type OptimisticUpload = {
  tempId: string;
  fileName: string;
  progress: number;
  status: OptimisticUploadStatus;
  error?: string;
  assetId?: string;
  url?: string;
};

export function createOptimisticUpload(file: File): OptimisticUpload {
  return {
    tempId: globalThis.crypto?.randomUUID?.() ?? `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    fileName: file.name,
    progress: 0,
    status: "queued"
  };
}

export function updateOptimisticUpload(
  upload: OptimisticUpload,
  patch: Partial<Omit<OptimisticUpload, "tempId" | "fileName">>
): OptimisticUpload {
  return {
    ...upload,
    ...patch,
    progress: Math.max(0, Math.min(100, patch.progress ?? upload.progress))
  };
}
