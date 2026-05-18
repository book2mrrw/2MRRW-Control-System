import { getServerSupabase } from "@/server/supabase/client";

const signalEvents: Array<{ userId: string; signalId: string; eventType: string; createdAt: string }> = [];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function trackSignalEvent(userId: string, signalId: string, eventType: string) {
  const event = { userId, signalId, eventType, createdAt: new Date().toISOString() };
  signalEvents.push(event);
  return event;
}

export async function trackSignalEventDurable(userId: string, signalId: string, eventType: string) {
  const event = trackSignalEvent(userId, signalId, eventType);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId) || !isUuid(signalId)) return event;

  await supabase.from("signal_events").insert({
    user_id: userId,
    signal_id: signalId,
    event_type: eventType
  });

  return event;
}

export function getSignalEvents() {
  return signalEvents;
}
