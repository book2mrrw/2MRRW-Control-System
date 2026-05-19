import { enqueueNotification } from "@/server/notifications/notificationService";
import { getServerSupabase } from "@/server/supabase/client";

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

function fromRow(row: {
  id: string;
  event_type: CircleEventType;
  label: CircleEvent["label"];
  actor_id: string;
  actor_display_name: string;
  target_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  audience: CircleEvent["audience"];
  payload: Record<string, unknown> | null;
  created_at: string;
}): CircleEvent {
  return {
    id: row.id,
    type: row.event_type,
    label: row.label,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    targetUserId: row.target_user_id ?? undefined,
    postId: row.post_id ?? undefined,
    commentId: row.comment_id ?? undefined,
    audience: row.audience,
    payload: row.payload ?? {},
    createdAt: row.created_at
  };
}

export async function createCircleEventDurable(input: CircleEventInput) {
  assertCircleEventType(input.type);
  const supabase = getServerSupabase();
  if (!supabase) return createCircleEvent(input);

  const { data, error } = await supabase
    .from("circle_events")
    .insert({
      event_type: input.type,
      label: circleEventLabels[input.type],
      actor_id: input.actorId ?? "artist_2mrrw",
      actor_display_name: input.actorDisplayName ?? "2MRRW",
      target_user_id: input.targetUserId ?? null,
      post_id: input.postId ?? null,
      comment_id: input.commentId ?? null,
      audience: input.audience ?? "public",
      payload: input.payload ?? {},
      visibility: "visible"
    })
    .select("*")
    .single();

  if (error || !data) return createCircleEvent(input);
  const event = fromRow(data);
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

export async function listCircleEventsDurable({ limit = 20, audience }: { limit?: number; audience?: CircleEvent["audience"] } = {}) {
  const supabase = getServerSupabase();
  if (!supabase) return listCircleEvents({ limit, audience });

  let query = supabase
    .from("circle_events")
    .select("*")
    .eq("visibility", "visible")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (audience) {
    query = query.eq("audience", audience);
  }

  const { data, error } = await query;
  if (error || !data) return listCircleEvents({ limit, audience });
  return data.map(fromRow);
}
