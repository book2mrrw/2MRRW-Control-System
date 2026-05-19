import type { CSSProperties, ReactNode } from "react";

type UploadMotionProps = {
  children: ReactNode;
  progress?: number;
  status?: "queued" | "uploading" | "processing" | "complete" | "failed";
};

export function UploadMotion({ children, progress = 0, status = "queued" }: UploadMotionProps) {
  return (
    <div
      className={`upload-motion upload-motion--${status}`}
      data-upload-status={status}
      style={{ "--upload-progress": `${Math.max(0, Math.min(100, progress))}%` } as CSSProperties}
    >
      {children}
    </div>
  );
}
