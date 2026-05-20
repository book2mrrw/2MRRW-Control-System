import "server-only";

import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import type { VaultItemRecord } from "@/server/vault/vaultItemService";
import { getServerSupabase } from "@/server/supabase/client";

function storefrontApiBase() {
  return (
    process.env.ARTIST_PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    process.env.ARTIST_PLATFORM_PUBLIC_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

/** Vague copy — no promo code or exact drop title in broadcast notifications. */
function vagueDropCopy() {
  return {
    title: "Something new appeared in the Vault",
    body: "A limited surprise is available for eligible members. Open the Vault when you are ready."
  };
}

export async function maybeSendDropNotification(item: VaultItemRecord) {
  if (!item.isDropItem || item.notificationSent) return { sent: false as const };

  const copy = vagueDropCopy();
  const secret = process.env.ADMIN_SEED_SECRET;

  if (secret) {
    await fetch(`${storefrontApiBase()}/api/admin/sync/drop-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seed-secret": secret
      },
      body: JSON.stringify({
        vaultItemId: item.id,
        title: copy.title,
        body: copy.body,
        audience: item.tierVisibility?.length ? "inner_circle" : "all",
        metadata: { dropType: item.dropType, glowEffect: item.glowEffect }
      }),
      cache: "no-store"
    }).catch(() => undefined);
  }

  const supabase = getServerSupabase();
  if (supabase) {
    await supabase
      .from("vault_items")
      .update({ notification_sent: true, updated_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  await persistSyncEvent({
    type: "vault.updated",
    entityId: item.id,
    timestamp: Date.now(),
    data: { dropNotification: true, vague: true }
  });

  return { sent: true as const };
}
