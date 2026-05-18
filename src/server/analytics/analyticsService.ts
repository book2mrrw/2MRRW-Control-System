const analyticsEvents: Array<{
  userId: string;
  eventType: string;
  properties: Record<string, unknown>;
  createdAt: string;
}> = [];

const validStreamThresholdSeconds = 30;

export function recordAnalyticsEvent(userId: string, eventType: string, properties: Record<string, unknown>) {
  const event = { userId, eventType, properties, createdAt: new Date().toISOString() };
  analyticsEvents.push(event);
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
