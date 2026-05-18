import { uploadMedia, type UploadMediaInput, type UploadMediaResult } from "@/lib/uploads/uploadMedia";

export type QueuedUpload<T = unknown> = UploadMediaInput & {
  id: string;
  onComplete?: (result: UploadMediaResult<T>) => void;
};

export function createUploadQueue(concurrency = 2) {
  const pending: Array<QueuedUpload> = [];
  let active = 0;

  const runNext = () => {
    if (active >= concurrency) return;
    const job = pending.shift();
    if (!job) return;

    active += 1;
    uploadMedia(job)
      .then((result) => job.onComplete?.(result))
      .finally(() => {
        active -= 1;
        runNext();
      });
  };

  return {
    enqueue(job: QueuedUpload) {
      pending.push(job);
      runNext();
    },
    pendingCount() {
      return pending.length;
    },
    activeCount() {
      return active;
    }
  };
}
