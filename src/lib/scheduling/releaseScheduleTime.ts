import { DateTime } from "luxon";

export type Meridiem = "AM" | "PM";

export type ScheduleParts = {
  year: number;
  month: number;
  day: number;
  hour12: number;
  minute: number;
  meridiem: Meridiem;
  timezone: string;
};

export const COMMON_PUBLISH_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / CET" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" }
] as const;

export function defaultPublishTimezone() {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  }
  return "America/Chicago";
}

export function timezoneLabel(timezone: string) {
  return COMMON_PUBLISH_TIMEZONES.find((row) => row.value === timezone)?.label ?? timezone.replace(/_/g, " ");
}

function hour24From12(hour12: number, meridiem: Meridiem) {
  const normalized = ((hour12 - 1) % 12) + 1;
  let hour = normalized % 12;
  if (meridiem === "PM") hour += 12;
  return hour;
}

export function localScheduleToUtcIso(parts: ScheduleParts): string {
  const hour = hour24From12(parts.hour12, parts.meridiem);
  const local = DateTime.fromObject(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour,
      minute: parts.minute,
      second: 0,
      millisecond: 0
    },
    { zone: parts.timezone }
  );
  if (!local.isValid) {
    throw new Error(local.invalidExplanation ?? "Invalid schedule date/time");
  }
  const utc = local.toUTC();
  const iso = utc.toISO();
  if (!iso) throw new Error("Could not convert schedule to UTC");
  return iso;
}

export function utcIsoToScheduleParts(utcIso: string, timezone: string): ScheduleParts | null {
  const dt = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(timezone);
  if (!dt.isValid) return null;
  const hour24 = dt.hour;
  const meridiem: Meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour12,
    minute: dt.minute,
    meridiem,
    timezone
  };
}

export function releaseDateFromParts(parts: Pick<ScheduleParts, "year" | "month" | "day">) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function releaseTimeFromParts(parts: Pick<ScheduleParts, "hour12" | "minute" | "meridiem">) {
  const hour = hour24From12(parts.hour12, parts.meridiem);
  return `${String(hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:00`;
}

export function formatSchedulePreview(parts: ScheduleParts) {
  const utcIso = localScheduleToUtcIso(parts);
  const local = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(parts.timezone);
  const dateLabel = local.toFormat("LLLL d, yyyy");
  const timeLabel = local.toFormat("h:mm a");
  return {
    headline: `${dateLabel} — ${timeLabel}`,
    timezone: timezoneLabel(parts.timezone),
    utcIso
  };
}

export function scheduleIsInFuture(utcIso: string) {
  return DateTime.fromISO(utcIso, { zone: "utc" }) > DateTime.utc();
}

export function formatCountdown(utcIso: string) {
  const target = DateTime.fromISO(utcIso, { zone: "utc" });
  const diff = target.diff(DateTime.utc(), ["days", "hours", "minutes", "seconds"]).toObject();
  const days = Math.floor(diff.days ?? 0);
  const hours = Math.floor(diff.hours ?? 0);
  const minutes = Math.floor(diff.minutes ?? 0);
  const seconds = Math.floor(diff.seconds ?? 0);
  if (days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) return null;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
