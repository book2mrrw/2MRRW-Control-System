import { signals } from "@/server/data/seedData";
import { getServerSupabase } from "@/server/supabase/client";

const userStates = new Map<string, Map<string, "new" | "seen" | "dismissed">>();
const cooldowns = new Map<string, number>();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function listActiveSignals(userId: string, at = new Date()) {
  const states = userStates.get(userId) ?? new Map<string, "new" | "seen" | "dismissed">();
  const now = at.getTime();

  return signals.filter((signal) => {
    const withinWindow = Date.parse(signal.startsAt) <= now && now <= Date.parse(signal.endsAt);
    const dismissed = states.get(signal.id) === "dismissed";
    const coolingDownUntil = cooldowns.get(`${userId}:${signal.cooldownKey}`) ?? 0;
    return withinWindow && !dismissed && now >= coolingDownUntil;
  });
}

export async function listActiveSignalsDurable(userId: string, at = new Date()) {
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId)) return listActiveSignals(userId, at);

  const { data, error } = await supabase
    .from("signals")
    .select("id, slug, title, audience_segment_id, starts_at, ends_at, cooldown_key")
    .lte("starts_at", at.toISOString())
    .gte("ends_at", at.toISOString());

  if (error || !data?.length) return listActiveSignals(userId, at);

  const { data: stateRows } = await supabase
    .from("signal_user_states")
    .select("signal_id, state")
    .eq("user_id", userId);
  const states = new Map((stateRows ?? []).map((row) => [row.signal_id, row.state]));

  return data
    .filter((signal) => states.get(signal.id) !== "dismissed")
    .map((signal) => ({
      id: signal.id,
      slug: signal.slug,
      title: signal.title,
      audienceSegmentId: signal.audience_segment_id,
      startsAt: signal.starts_at,
      endsAt: signal.ends_at,
      cooldownKey: signal.cooldown_key
    }));
}

export function updateSignalState(userId: string, signalId: string, state: "seen" | "dismissed") {
  const states = userStates.get(userId) ?? new Map<string, "new" | "seen" | "dismissed">();
  states.set(signalId, state);
  userStates.set(userId, states);

  if (state === "dismissed") {
    const signal = signals.find((item) => item.id === signalId);
    if (signal) {
      cooldowns.set(`${userId}:${signal.cooldownKey}`, Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  return { signalId, state };
}

export async function updateSignalStateDurable(userId: string, signalId: string, state: "seen" | "dismissed") {
  const result = updateSignalState(userId, signalId, state);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId) || !isUuid(signalId)) return result;

  await supabase.from("signal_user_states").upsert({
    user_id: userId,
    signal_id: signalId,
    state,
    updated_at: new Date().toISOString()
  });

  return result;
}
