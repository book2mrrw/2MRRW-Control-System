/** Stable locale + timezone for SSR/client hydration parity. */
const STABLE_LOCALE = "en-US";
const STABLE_TIME_ZONE = "UTC";

export function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(STABLE_LOCALE, {
    timeZone: STABLE_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}
