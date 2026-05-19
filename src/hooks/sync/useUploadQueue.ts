"use client";

import { useCallback, useEffect, useState } from "react";

export type UploadQueueStatus = "queued" | "uploading" | "processing" | "complete" | "failed";

export type UploadQueueItem = {
  id: string;
  label: string;
  status: UploadQueueStatus;
  path?: string;
  releaseId?: string;
  category?: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
};

let queue: UploadQueueItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function enqueueUpload(item: Omit<UploadQueueItem, "id" | "startedAt" | "updatedAt" | "status"> & { status?: UploadQueueStatus }) {
  const entry: UploadQueueItem = {
    id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: item.status ?? "queued",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    ...item
  };
  queue = [entry, ...queue].slice(0, 24);
  notify();
  return entry.id;
}

export function patchUploadQueue(id: string, patch: Partial<UploadQueueItem>) {
  queue = queue.map((row) => (row.id === id ? { ...row, ...patch, updatedAt: Date.now() } : row));
  notify();
}

export function clearCompletedUploads() {
  queue = queue.filter((row) => row.status !== "complete");
  notify();
}

export function listUploadQueue() {
  return queue;
}

export function useUploadQueue() {
  const [, tick] = useState(0);
  const refresh = useCallback(() => tick((value) => value + 1), []);

  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  return {
    items: queue,
    enqueue: enqueueUpload,
    patch: patchUploadQueue,
    clearCompleted: clearCompletedUploads
  };
}
