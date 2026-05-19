export type ReleaseReadinessCheck = {
  key: string;
  passed: boolean;
  message: string;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; checks?: ReleaseReadinessCheck[] };

function studioJsonInit(body?: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  };
}

function parseChecks(details: unknown): ReleaseReadinessCheck[] | undefined {
  if (!Array.isArray(details)) return undefined;
  return details
    .map((entry) => {
      if (typeof entry !== "object" || !entry || !("message" in entry)) return null;
      const check = entry as ReleaseReadinessCheck;
      return {
        key: String(check.key ?? "check"),
        passed: Boolean(check.passed),
        message: String(check.message)
      };
    })
    .filter((entry): entry is ReleaseReadinessCheck => Boolean(entry));
}

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string; details?: unknown };
  };
  if (!response.ok) {
    const checks = parseChecks(payload.error?.details);
    const failed = checks?.filter((check) => !check.passed) ?? [];
    const checklistHint = failed.length
      ? failed.map((check) => check.message).join(" · ")
      : "";
    const message = payload.error?.message ?? "Request failed";
    return {
      ok: false,
      error: checklistHint ? `${message} — ${checklistHint}` : message,
      checks
    };
  }
  return { ok: true, data: payload.data as T };
}

export async function fetchReleaseReadinessAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/readiness`, { cache: "no-store" });
  return parseResponse<{ ready: boolean; checks: ReleaseReadinessCheck[] }>(response);
}

export async function publishReleaseAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/${releaseId}/publish`, studioJsonInit());
  return parseResponse<{ ok?: boolean; message?: string; status?: string }>(response);
}

export async function archiveReleaseAction(releaseId: string, reason = "Archived from Creator Studio") {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/actions`, studioJsonInit({ action: "archive", reason }));
  return parseResponse<unknown>(response);
}

export async function recoverReleaseAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/actions`, studioJsonInit({ action: "recover" }));
  return parseResponse<unknown>(response);
}

export async function unpublishReleaseAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/actions`, studioJsonInit({ action: "unpublish" }));
  return parseResponse<unknown>(response);
}

export async function duplicateReleaseAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/actions`, studioJsonInit({ action: "duplicate" }));
  return parseResponse<{ id: string; slug: string; title: string }>(response);
}

export async function syncReleaseToFrontendAction(releaseId: string) {
  const response = await fetch(`/api/admin/releases/manage/${releaseId}/sync`, studioJsonInit());
  return parseResponse<{ releaseId: string; synced: boolean }>(response);
}
