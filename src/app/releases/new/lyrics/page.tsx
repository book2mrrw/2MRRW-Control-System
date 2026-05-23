"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FormSection, PageHeader, WorkflowStepper } from "@/components/control/OperationalPrimitives";
import { patchReleaseTrack } from "@/services/catalog/releaseStudioClient";

type DraftTrack = { id: string; title: string; position: number; lyricsText?: string | null };
type Draft = { id: string; title: string; tracks: DraftTrack[] };

export default function ReleaseLyricsStepPage() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const response = await fetch("/api/admin/releases/manage", {
        headers: { "x-admin": "true" },
        credentials: "include"
      });
      const payload = await response.json().catch(() => null);
      const nextDraft = payload?.data?.drafts?.[0] ?? null;
      if (!cancelled) {
        setDraft(nextDraft);
        setSelectedTrackId(nextDraft?.tracks?.[0]?.id ?? "");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrack = draft?.tracks.find((track) => track.id === selectedTrackId);

  useEffect(() => {
    if (!selectedTrack) return;
    setLyrics(selectedTrack.lyricsText ?? "");
  }, [selectedTrack?.id, selectedTrack?.lyricsText]);

  const saveLyrics = useCallback(async () => {
    if (!draft || !selectedTrackId) return;
    setBusy(true);
    setError("");
    const result = await patchReleaseTrack(draft.id, selectedTrackId, {
      lyricsText: lyrics.trim() || null
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        tracks: current.tracks.map((track) =>
          track.id === selectedTrackId ? { ...track, lyricsText: lyrics.trim() || null } : track
        )
      };
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }, [draft, lyrics, selectedTrackId]);

  if (loading) {
    return <p className="form-status">Loading lyrics…</p>;
  }

  if (!draft) {
    return (
      <>
        <PageHeader
          eyebrow="2MRRW RELEASE SYSTEM"
          title="Lyrics"
          description="Create a release draft before adding lyrics."
        />
        <p className="form-status">
          <Link href="/releases/new">Create release</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="2MRRW RELEASE SYSTEM"
        title="Lyrics"
        description="Plain-text lyrics save to the selected track row."
        actions={[{ label: "Back to tracks", href: "/releases/new/tracks" }]}
      />
      <div className="release-wizard-shell">
        <div className="release-wizard-sticky-nav">
          <WorkflowStepper current="tracks" />
        </div>
        <div className="release-wizard-scroll">
          <FormSection title="Track lyrics" description="Save lyrics for the exact track. Empty lyrics hide the storefront panel.">
            <label>
              Track
              <select value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)}>
                {draft.tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.position}. {track.title || "Untitled track"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lyrics
              <textarea
                rows={14}
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                placeholder="Paste or type lyrics here…"
              />
            </label>
            <div className="inline-action-row">
              <button className="control-button" disabled={busy || !selectedTrackId} onClick={() => void saveLyrics()} type="button">
                {busy ? "Saving…" : "Save Lyrics"}
              </button>
              {savedFlash ? <span className="form-status">Saved ✓</span> : null}
            </div>
            {error ? <p className="form-status">{error}</p> : null}
          </FormSection>
        </div>
      </div>
    </>
  );
}
