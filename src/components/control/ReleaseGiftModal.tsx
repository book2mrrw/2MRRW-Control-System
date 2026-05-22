"use client";

import { AdminGiftSendModal, mapReleaseType } from "@/components/control/AdminGiftSendModal";

type ReleaseGiftModalProps = {
  releaseId: string;
  releaseTitle: string;
  releaseType?: string;
  coverUrl?: string | null;
  onClose: () => void;
};

export function ReleaseGiftModal({ releaseId, releaseTitle, releaseType, coverUrl, onClose }: ReleaseGiftModalProps) {
  return (
    <AdminGiftSendModal
      itemType={mapReleaseType(releaseType || "single")}
      itemId={releaseId}
      itemTitle={releaseTitle}
      coverUrl={coverUrl}
      onClose={onClose}
    />
  );
}
