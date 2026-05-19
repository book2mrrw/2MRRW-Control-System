type StudioJson = Record<string, unknown>;

function studioHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "x-admin": "true" };
}

async function parseStudioResponse<T>(response: Response): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok) {
    return { ok: false, error: payload.error?.message ?? "Request failed" };
  }
  return { ok: true, data: payload.data as T };
}

export async function createReleaseDraft(releaseType: string, trackCount?: number) {
  const response = await fetch("/api/admin/releases/manage", {
    method: "POST",
    headers: studioHeaders(),
    body: JSON.stringify({ releaseType, trackCount })
  });
  return parseStudioResponse<{ id: string; slug: string; title: string }>(response);
}

export async function patchReleaseMetadata(releaseId: string, body: StudioJson) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/metadata`, {
    method: "PATCH",
    headers: studioHeaders(),
    body: JSON.stringify(body)
  });
  return parseStudioResponse<unknown>(response);
}

export async function addReleaseTrack(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks`, {
    method: "POST",
    headers: studioHeaders()
  });
  return parseStudioResponse<{ id: string; title: string; position: number }>(response);
}

export async function patchReleaseTrack(releaseId: string, trackId: string, body: StudioJson) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks/${trackId}`, {
    method: "PATCH",
    headers: studioHeaders(),
    body: JSON.stringify(body)
  });
  return parseStudioResponse<unknown>(response);
}

export async function deleteReleaseTrack(releaseId: string, trackId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks/${trackId}`, {
    method: "DELETE",
    headers: studioHeaders()
  });
  if (response.status === 204) return { ok: true as const, data: null };
  return parseStudioResponse<null>(response);
}

export async function reorderReleaseTracks(releaseId: string, trackIds: string[]) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/tracks/reorder`, {
    method: "PATCH",
    headers: studioHeaders(),
    body: JSON.stringify({ trackIds })
  });
  return parseStudioResponse<unknown>(response);
}

export async function saveReleaseLyricsSession(releaseId: string, lyrics: Record<string, string>) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/session`, {
    method: "PATCH",
    headers: studioHeaders(),
    body: JSON.stringify({ reason: "lyrics_edit", lyrics, cloudSynced: true })
  });
  return parseStudioResponse<unknown>(response);
}

export async function scheduleReleaseAction(
  releaseId: string,
  body: {
    year: number;
    month: number;
    day: number;
    hour12: number;
    minute: number;
    meridiem: "AM" | "PM";
    timezone: string;
  }
) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/schedule`, {
    method: "POST",
    headers: studioHeaders(),
    body: JSON.stringify(body)
  });
  return parseStudioResponse<{
    releaseId: string;
    status: string;
    scheduledPublishAt: string;
    releaseDate: string;
    releaseTime: string;
    publishTimezone: string;
  }>(response);
}

export async function loadReleaseLyricsSession(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/session`, {
    headers: studioHeaders(),
    cache: "no-store"
  });
  const parsed = await parseStudioResponse<{ restore?: { lyrics?: Record<string, string> } }>(response);
  if (!parsed.ok) return parsed;
  return { ok: true as const, data: parsed.data.restore?.lyrics ?? {} };
}
