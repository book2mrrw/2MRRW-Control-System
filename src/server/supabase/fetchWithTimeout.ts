const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Minimal fetch wrapper — aborts hung Supabase/PostgREST calls after `timeoutMs`.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException("Supabase fetch timeout", "TimeoutError")), timeoutMs);

  const upstream = init?.signal;
  if (upstream) {
    if (upstream.aborted) {
      clearTimeout(timeoutId);
      controller.abort(upstream.reason);
    } else {
      upstream.addEventListener("abort", () => controller.abort(upstream.reason), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

export const SUPABASE_FETCH_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;
