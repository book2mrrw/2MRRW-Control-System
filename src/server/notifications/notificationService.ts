const preferences = new Map<string, Record<string, boolean>>([
  ["user_demo", { email: true, push: false, signal: true, radio: true }]
]);
const inbox = new Map<string, Array<{ id: string; title: string; read: boolean }>>([
  ["user_demo", [{ id: "notif_welcome", title: "Welcome to Control", read: false }]]
]);

export function getNotificationSummary(userId: string) {
  const messages = inbox.get(userId) ?? [];
  return {
    unreadCount: messages.filter((message) => !message.read).length,
    preferences: preferences.get(userId) ?? { email: true, push: false, signal: true, radio: true }
  };
}

export function listInbox(userId: string) {
  return inbox.get(userId) ?? [];
}

export function enqueueNotification(userId: string, notification: { id: string; title: string; read?: boolean }) {
  const next = [{ ...notification, read: notification.read ?? false }, ...(inbox.get(userId) ?? [])];
  inbox.set(userId, next);
  return next[0];
}

export function updateNotificationPreferences(userId: string, input: Record<string, boolean>) {
  const next = { ...(preferences.get(userId) ?? {}), ...input };
  preferences.set(userId, next);
  return next;
}
