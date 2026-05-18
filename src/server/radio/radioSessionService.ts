import { radioChannels } from "@/server/data/seedData";

const sessions = new Map<string, { id: string; userId: string; channelId: string; startedAt: string }>();

export function startRadioSession(userId: string, channelSlug = "main") {
  const channel = radioChannels.find((item) => item.slug === channelSlug && item.enabled);
  if (!channel) {
    return null;
  }

  const session = {
    id: `radio_session_${userId}_${Date.now()}`,
    userId,
    channelId: channel.id,
    startedAt: new Date().toISOString()
  };
  sessions.set(session.id, session);
  return session;
}

export function getRadioSession(sessionId: string) {
  return sessions.get(sessionId) ?? null;
}
