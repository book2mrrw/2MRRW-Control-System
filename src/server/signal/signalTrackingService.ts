const signalEvents: Array<{ userId: string; signalId: string; eventType: string; createdAt: string }> = [];

export function trackSignalEvent(userId: string, signalId: string, eventType: string) {
  const event = { userId, signalId, eventType, createdAt: new Date().toISOString() };
  signalEvents.push(event);
  return event;
}

export function getSignalEvents() {
  return signalEvents;
}
