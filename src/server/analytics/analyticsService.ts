import { getServerSupabase } from "@/server/supabase/client";

const analyticsEvents: Array<{
  userId: string;
  eventType: string;
  properties: Record<string, unknown>;
  createdAt: string;
}> = [];

const validStreamThresholdSeconds = 30;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function recordAnalyticsEvent(userId: string, eventType: string, properties: Record<string, unknown>) {
  const event = { userId, eventType, properties, createdAt: new Date().toISOString() };
  analyticsEvents.push(event);
  return event;
}

export async function recordAnalyticsEventDurable(userId: string, eventType: string, properties: Record<string, unknown>) {
  const event = { userId, eventType, properties, createdAt: new Date().toISOString() };
  analyticsEvents.push(event);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) {
    return event;
  }

  const { error } = await supabase.from("analytics_events").insert({
    user_id: userId,
    event_type: eventType,
    properties
  });
  if (error) throw new Error(error.message);

  return event;
}

export function listAnalyticsEvents() {
  return analyticsEvents;
}

export function recordStreamAnalytics(
  userId: string,
  input: { trackId: string; listenedSeconds: number; countryCode?: string; releaseId?: string }
) {
  return recordAnalyticsEvent(userId, "stream.playback", {
    ...input,
    validStream: input.listenedSeconds >= validStreamThresholdSeconds,
    validStreamThresholdSeconds
  });
}

export async function recordStreamAnalyticsDurable(
  userId: string,
  input: { trackId: string; listenedSeconds: number; countryCode?: string; releaseId?: string }
) {
  const properties = {
    ...input,
    validStream: input.listenedSeconds >= validStreamThresholdSeconds,
    validStreamThresholdSeconds
  };
  const event = await recordAnalyticsEventDurable(userId, "stream.playback", properties);
  const supabase = getServerSupabase();
  if (supabase && isUuid(input.trackId)) {
    await supabase.from("media_stream_events").insert({
      user_id: isUuid(userId) ? userId : null,
      track_id: input.trackId,
      event_type: "stream.playback"
    });
  }
  return event;
}

export function getStreamingAnalyticsSummary() {
  const streamEvents = analyticsEvents.filter((event) => event.eventType === "stream.playback");
  const validStreams = streamEvents.filter((event) => event.properties.validStream === true);
  const countries = new Set(streamEvents.map((event) => event.properties.countryCode).filter(Boolean));

  return {
    totalStreamEvents: streamEvents.length,
    validStreams: validStreams.length,
    thresholdSeconds: validStreamThresholdSeconds,
    countryCount: countries.size
  };
}
