import { signals } from "@/server/data/seedData";

const userStates = new Map<string, Map<string, "new" | "seen" | "dismissed">>();
const cooldowns = new Map<string, number>();

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
