import { radioChannels, radioFeed, tracks } from "@/server/data/seedData";
import { getServerSupabase } from "@/server/supabase/client";

const interactions: Array<{ userId: string; channelId: string; kind: string; itemId: string; createdAt: string }> = [];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function getRadioFeed(channelSlug = "main") {
  const channel = radioChannels.find((item) => item.slug === channelSlug && item.enabled);
  if (!channel) {
    return null;
  }

  return {
    channel,
    items: radioFeed
      .filter((item) => item.channelId === channel.id)
      .map((item) => ({ ...item, track: tracks.find((track) => track.id === item.trackId) }))
  };
}

export function recordRadioInteraction(userId: string, channelId: string, kind: string, itemId: string) {
  const interaction = { userId, channelId, kind, itemId, createdAt: new Date().toISOString() };
  interactions.push(interaction);
  return interaction;
}

export async function recordRadioInteractionDurable(userId: string, channelId: string, kind: string, itemId: string) {
  const interaction = recordRadioInteraction(userId, channelId, kind, itemId);
  const supabase = getServerSupabase();
  if (!supabase || !isUuid(userId) || !isUuid(channelId) || !isUuid(itemId)) return interaction;

  await supabase.from("radio_interactions").insert({
    user_id: userId,
    radio_channel_id: channelId,
    kind,
    item_id: itemId
  });

  return interaction;
}

export function getRadioInteractions() {
  return interactions;
}
