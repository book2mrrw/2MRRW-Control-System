import type { ReactNode } from "react";

type MotionLayerProps = {
  children: ReactNode;
  className?: string;
  state?: "idle" | "entering" | "uploading" | "complete" | "error";
};

export function MotionLayer({ children, className = "", state = "idle" }: MotionLayerProps) {
  return (
    <div className={`motion-layer motion-layer--${state} ${className}`.trim()} data-motion-state={state}>
      {children}
    </div>
  );
}
