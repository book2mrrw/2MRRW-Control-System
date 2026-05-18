import { radioChannels } from "@/server/data/seedData";
import { getServerSupabase } from "@/server/supabase/client";

const sessions = new Map<string, { id: string; userId: string; channelId: string; startedAt: string }>();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

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

export async function startRadioSessionDurable(userId: string, channelSlug = "main") {
  const supabase = getServerSupabase();
  if (supabase && isUuid(userId)) {
    const { data: channel } = await supabase
      .from("radio_channels")
      .select("id, slug, title, enabled")
      .eq("slug", channelSlug)
      .eq("enabled", true)
      .maybeSingle();

    if (channel) {
      const { data, error } = await supabase
        .from("radio_sessions")
        .insert({ user_id: userId, radio_channel_id: channel.id })
        .select("id, user_id, radio_channel_id, started_at")
        .single();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          channelId: data.radio_channel_id,
          startedAt: data.started_at
        };
      }
    }
  }

  return startRadioSession(userId, channelSlug);
}

export function getRadioSession(sessionId: string) {
  return sessions.get(sessionId) ?? null;
}
