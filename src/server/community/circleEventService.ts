import { enqueueNotification } from "@/server/notifications/notificationService";

export const circleEventTypes = ["active", "replied", "live", "highlighted_comment", "reacted"] as const;
export type CircleEventType = (typeof circleEventTypes)[number];

export const circleEventLabels = {
  active: "2MRRW active",
  replied: "2MRRW replied",
  live: "2MRRW is live",
  highlighted_comment: "2MRRW highlighted a comment",
  reacted: "2MRRW reacted"
} as const satisfies Record<CircleEventType, string>;

export type CircleEventInput = {
  type: CircleEventType;
  actorId?: string;
  actorDisplayName?: string;
  targetUserId?: string;
  postId?: string;
  commentId?: string;
  audience?: "public" | "members" | "inner_circle" | "vault";
  payload?: Record<string, unknown>;
};

export type CircleEvent = CircleEventInput & {
  id: string;
  label: (typeof circleEventLabels)[CircleEventType];
  actorId: string;
  actorDisplayName: string;
  audience: NonNullable<CircleEventInput["audience"]>;
  createdAt: string;
};

const circleEvents: CircleEvent[] = [];

function nowIso() {
  return new Date().toISOString();
}

function nextId() {
  return `circle_evt_${Math.random().toString(36).slice(2, 10)}`;
}

function assertCircleEventType(type: string): asserts type is CircleEventType {
  if (!circleEventTypes.includes(type as CircleEventType)) {
    throw new Error("Unsupported Circle event type");
  }
}

export function createCircleEvent(input: CircleEventInput) {
  assertCircleEventType(input.type);

  const event: CircleEvent = {
    ...input,
    id: nextId(),
    label: circleEventLabels[input.type],
    actorId: input.actorId ?? "artist_2mrrw",
    actorDisplayName: input.actorDisplayName ?? "2MRRW",
    audience: input.audience ?? "public",
    payload: input.payload ?? {},
    createdAt: nowIso()
  };
  circleEvents.unshift(event);

  if (event.targetUserId) {
    enqueueNotification(event.targetUserId, {
      id: `notif_${event.id}`,
      title: event.label,
      read: false
    });
  }

  return event;
}

export function triggerCircleActive(input: Omit<CircleEventInput, "type"> = {}) {
  return createCircleEvent({ ...input, type: "active" });
}

export function triggerCircleReplied(input: Omit<CircleEventInput, "type"> = {}) {
  return createCircleEvent({ ...input, type: "replied" });
}

export function triggerCircleLive(input: Omit<CircleEventInput, "type"> = {}) {
  return createCircleEvent({ ...input, type: "live" });
}

export function triggerCircleHighlightedComment(input: Omit<CircleEventInput, "type"> = {}) {
  return createCircleEvent({ ...input, type: "highlighted_comment" });
}

export function triggerCircleReacted(input: Omit<CircleEventInput, "type"> = {}) {
  return createCircleEvent({ ...input, type: "reacted" });
}

export function listCircleEvents({ limit = 20, audience }: { limit?: number; audience?: CircleEvent["audience"] } = {}) {
  return circleEvents
    .filter((event) => !audience || event.audience === audience)
    .slice(0, Math.max(1, Math.min(limit, 50)));
}
