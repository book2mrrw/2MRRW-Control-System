"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeEvents } from "@/hooks/sync/useRealtimeEvents";

type UseReleasesOptions = {
  endpoint?: string;
  limit?: number;
};

export function useReleases<TRelease = unknown>({ endpoint = "/api/releases", limit = 24 }: UseReleasesOptions = {}) {
  const [releases, setReleases] = useState<TRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { events, connected } = useRealtimeEvents();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${endpoint}?limit=${limit}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Release sync failed (${response.status})`);
      const payload = await response.json();
      setReleases(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Release sync failed");
    } finally {
      setLoading(false);
    }
  }, [endpoint, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const latest = events[0];
    if (!latest || !latest.type.startsWith("release_")) return;
    void refetch();
  }, [events, refetch]);

  return { releases, loading, error, connected, refetch };
}
