"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ReleaseType = "single" | "ep" | "album" | "deluxe";
export type ReleaseStatus = "draft" | "live";

export type ControlRelease = {
  id: string;
  type: ReleaseType;
  title: string;
  artist: string;
  releaseDate: string;
  status: ReleaseStatus;
  tracks: Array<{ id: string; title: string; credits: string; audioFile?: string }>;
  coverUrl?: string;
  youtubeUrl?: string;
  createdAt: number;
  updatedAt: number;
};

export type HeroConfig = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundUrl: string;
  backgroundType: "image" | "video";
};

export const releaseTypeLimits: Record<ReleaseType, [number, number]> = {
  single: [1, 1],
  ep: [2, 6],
  album: [7, 30],
  deluxe: [7, 40]
};

type Toast = { id: string; message: string };

type ReleaseInput = Pick<ControlRelease, "type" | "title" | "artist" | "releaseDate" | "tracks" | "coverUrl" | "youtubeUrl">;

type StoreContextValue = {
  releases: ControlRelease[];
  heroConfig: HeroConfig;
  log: string[];
  toasts: Toast[];
  previewOpen: boolean;
  createRelease: (input: ReleaseInput) => ControlRelease;
  updateRelease: (releaseId: string, patch: Partial<ReleaseInput>) => void;
  publishRelease: (releaseId: string) => void;
  unpublishRelease: (releaseId: string) => void;
  deleteRelease: (releaseId: string) => void;
  updateMedia: (releaseId: string, patch: Pick<Partial<ControlRelease>, "coverUrl" | "youtubeUrl"> & { audioFile?: string }) => void;
  updateHero: (patch: HeroConfig) => void;
  setPreviewOpen: (open: boolean) => void;
  dismissToast: (toastId: string) => void;
};

const emptyHero: HeroConfig = {
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  backgroundUrl: "",
  backgroundType: "image"
};

const StoreContext = createContext<StoreContextValue | null>(null);

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ReleaseControlProvider({ children }: { children: ReactNode }) {
  const [releases, setReleases] = useState<ControlRelease[]>([]);
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(emptyHero);
  const [log, setLog] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const record = useCallback((message: string) => {
    setLog((current) => [message, ...current].slice(0, 20));
    const toast = { id: nextId("toast"), message };
    setToasts((current) => [toast, ...current].slice(0, 4));
  }, []);

  const createRelease = useCallback((input: ReleaseInput) => {
    const now = Date.now();
    const release: ControlRelease = {
      ...input,
      id: nextId("release"),
      status: "draft",
      createdAt: now,
      updatedAt: now
    };
    setReleases((current) => [release, ...current]);
    record(`Created ${input.type} draft: ${input.title || "Untitled release"}`);
    return release;
  }, [record]);

  const updateRelease = useCallback((releaseId: string, patch: Partial<ReleaseInput>) => {
    setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, ...patch, updatedAt: Date.now() } : release));
    record("Release updated");
  }, [record]);

  const publishRelease = useCallback((releaseId: string) => {
    setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, status: "live", updatedAt: Date.now() } : release));
    record("Release published live");
  }, [record]);

  const unpublishRelease = useCallback((releaseId: string) => {
    setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, status: "draft", updatedAt: Date.now() } : release));
    record("Release moved back to draft");
  }, [record]);

  const deleteRelease = useCallback((releaseId: string) => {
    setReleases((current) => current.filter((release) => release.id !== releaseId));
    record("Release deleted");
  }, [record]);

  const updateMedia = useCallback((releaseId: string, patch: Pick<Partial<ControlRelease>, "coverUrl" | "youtubeUrl"> & { audioFile?: string }) => {
    setReleases((current) => current.map((release) => {
      if (release.id !== releaseId) return release;
      const tracks = patch.audioFile && release.tracks[0]
        ? release.tracks.map((track, index) => index === 0 ? { ...track, audioFile: patch.audioFile } : track)
        : release.tracks;
      return { ...release, coverUrl: patch.coverUrl ?? release.coverUrl, youtubeUrl: patch.youtubeUrl ?? release.youtubeUrl, tracks, updatedAt: Date.now() };
    }));
    record("Media updated");
  }, [record]);

  const updateHero = useCallback((patch: HeroConfig) => {
    setHeroConfig(patch);
    record("Hero editor saved");
  }, [record]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    releases,
    heroConfig,
    log,
    toasts,
    previewOpen,
    createRelease,
    updateRelease,
    publishRelease,
    unpublishRelease,
    deleteRelease,
    updateMedia,
    updateHero,
    setPreviewOpen,
    dismissToast
  }), [createRelease, deleteRelease, dismissToast, heroConfig, log, previewOpen, publishRelease, releases, unpublishRelease, updateHero, updateMedia, updateRelease, toasts]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useReleaseControl() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useReleaseControl must be used inside ReleaseControlProvider");
  return value;
}
