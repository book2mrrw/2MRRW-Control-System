"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeEvents } from "@/hooks/sync/useRealtimeEvents";

type UseHeroOptions = {
  endpoint?: string;
};

export function useHero<THero = unknown>({ endpoint = "/api/admin/hero-config" }: UseHeroOptions = {}) {
  const [hero, setHero] = useState<THero | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { events, connected } = useRealtimeEvents();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`Hero sync failed (${response.status})`);
      const payload = await response.json();
      setHero((payload.data ?? payload) as THero);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Hero sync failed");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (events[0]?.type === "hero_updated") {
      void refetch();
    }
  }, [events, refetch]);

  return { hero, loading, error, connected, refetch };
}
