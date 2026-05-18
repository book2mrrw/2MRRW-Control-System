import { radioChannels, radioFeed, tracks } from "@/server/data/seedData";

const interactions: Array<{ userId: string; channelId: string; kind: string; itemId: string; createdAt: string }> = [];

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

export function getRadioInteractions() {
  return interactions;
}
