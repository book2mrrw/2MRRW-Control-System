"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COMMON_PUBLISH_TIMEZONES,
  defaultPublishTimezone,
  formatCountdown,
  formatSchedulePreview,
  utcIsoToScheduleParts,
  type Meridiem,
  type ScheduleParts
} from "@/lib/scheduling/releaseScheduleTime";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

function currentYear() {
  return new Date().getFullYear();
}

export type ReleaseScheduleValue = ScheduleParts;

type ReleaseScheduleSectionProps = {
  scheduledPublishAt?: string | null;
  timezone?: string | null;
  disabled?: boolean;
  compact?: boolean;
  onChange?: (value: ReleaseScheduleValue, preview: { headline: string; timezone: string; utcIso: string }) => void;
};

export function buildScheduleValueFromDraft(scheduledPublishAt?: string | null, timezone?: string | null): ReleaseScheduleValue {
  const zone = timezone ?? defaultPublishTimezone();
  if (scheduledPublishAt) {
    const parsed = utcIsoToScheduleParts(scheduledPublishAt, zone);
    if (parsed) return parsed;
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour12: 12,
    minute: 0,
    meridiem: "PM",
    timezone: zone
  };
}

export function ReleaseScheduleSection({
  scheduledPublishAt,
  timezone,
  disabled,
  compact,
  onChange
}: ReleaseScheduleSectionProps) {
  const [value, setValue] = useState<ReleaseScheduleValue>(() => buildScheduleValueFromDraft(scheduledPublishAt, timezone));

  useEffect(() => {
    setValue(buildScheduleValueFromDraft(scheduledPublishAt, timezone));
  }, [scheduledPublishAt, timezone]);

  const preview = useMemo(() => {
    try {
      return formatSchedulePreview(value);
    } catch {
      return { headline: "Select a valid date and time", timezone: value.timezone, utcIso: "" };
    }
  }, [value]);

  const countdown = scheduledPublishAt ? formatCountdown(scheduledPublishAt) : formatCountdown(preview.utcIso);

  useEffect(() => {
    onChange?.(value, preview);
  }, [value, preview]);

  function patch(next: Partial<ReleaseScheduleValue>) {
    setValue((current) => ({ ...current, ...next }));
  }

  const years = Array.from({ length: 8 }, (_, index) => currentYear() + index);

  return (
    <section className={`media-sync-schedule${compact ? " compact" : ""}`}>
      <header className="media-sync-schedule-head">
        <p className="media-sync-schedule-kicker">Global drop</p>
        <h3>Schedule release</h3>
        <p className="media-sync-schedule-sub">Pick the exact moment this release goes live worldwide. Stored as UTC with your timezone.</p>
      </header>

      <div className="media-sync-schedule-grid">
        <label className="media-sync-schedule-field">
          <span>Month</span>
          <select disabled={disabled} value={value.month} onChange={(event) => patch({ month: Number(event.target.value) })}>
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="media-sync-schedule-field">
          <span>Day</span>
          <select disabled={disabled} value={value.day} onChange={(event) => patch({ day: Number(event.target.value) })}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="media-sync-schedule-field">
          <span>Year</span>
          <select disabled={disabled} value={value.year} onChange={(event) => patch({ year: Number(event.target.value) })}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="media-sync-schedule-field">
          <span>Hour</span>
          <select disabled={disabled} value={value.hour12} onChange={(event) => patch({ hour12: Number(event.target.value) })}>
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
        <label className="media-sync-schedule-field">
          <span>Minute</span>
          <select disabled={disabled} value={value.minute} onChange={(event) => patch({ minute: Number(event.target.value) })}>
            {MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className="media-sync-schedule-field">
          <span>AM / PM</span>
          <select
            disabled={disabled}
            value={value.meridiem}
            onChange={(event) => patch({ meridiem: event.target.value as Meridiem })}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
        <label className="media-sync-schedule-field span-2">
          <span>Timezone</span>
          <select disabled={disabled} value={value.timezone} onChange={(event) => patch({ timezone: event.target.value })}>
            {COMMON_PUBLISH_TIMEZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="media-sync-schedule-preview card">
        <p className="media-sync-schedule-preview-label">Launch preview</p>
        <strong>{preview.headline}</strong>
        <span>{preview.timezone}</span>
        {countdown ? <em className="media-sync-schedule-countdown">Goes live in {countdown}</em> : null}
      </div>
    </section>
  );
}

export function ScheduledCountdown({ scheduledPublishAt }: { scheduledPublishAt?: string | null }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!scheduledPublishAt) {
      setLabel(null);
      return;
    }
    const tick = () => setLabel(formatCountdown(scheduledPublishAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [scheduledPublishAt]);
  if (!label) return null;
  return <span className="media-sync-schedule-countdown pill">{label}</span>;
}
