import "server-only";

import { createHash, randomBytes } from "crypto";

import { collectorCardProductSlug, releaseProductSlug } from "@/server/commerce/pricingTaxonomies";
import { getServerSupabase } from "@/server/supabase/client";

import { storefrontSyncBaseUrl } from "@/server/sync/storefrontSyncConfig";

const STOREFRONT_URL = storefrontSyncBaseUrl();

export type GiftItemType = "single" | "ep" | "album" | "deluxe" | "collector_card";

export type SendGiftInput = {
  item_type: GiftItemType;
  item_id: string;
  item_title: string;
  recipient_email: string;
  recipient_phone?: string | null;
  message?: string | null;
  sender_id?: string | null;
  force_duplicate?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashGiftToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function createGiftToken() {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashGiftToken(raw) };
}

async function resolveProductId(itemType: GiftItemType, itemId: string) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: direct } = await supabase.from("products").select("id, slug, title, cover_url").eq("id", itemId).maybeSingle();
  if (direct) return direct;

  if (itemType === "collector_card") {
    const { data: card } = await supabase.from("collector_cards").select("slug, title, cover_url").eq("id", itemId).maybeSingle();
    if (!card?.slug) return null;
    const slug = collectorCardProductSlug(card.slug);
    const { data: product } = await supabase.from("products").select("id, slug, title, cover_url").eq("slug", slug).maybeSingle();
    return product ? { ...product, title: card.title || product.title, cover_url: card.cover_url || product.cover_url } : null;
  }

  const { data: release } = await supabase.from("releases").select("slug, title, cover_art_r2_key").eq("id", itemId).maybeSingle();
  if (!release?.slug) return null;
  const slug = releaseProductSlug(release.slug);
  const { data: product } = await supabase.from("products").select("id, slug, title, cover_url").eq("slug", slug).maybeSingle();
  return product ? { ...product, title: release.title || product.title } : null;
}

async function findRecipientId(email: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data: profile } = await supabase.from("profiles").select("id").ilike("email", email).maybeSingle();
  return profile?.id ?? null;
}

async function sendGiftEmail(payload: {
  to: string;
  itemTitle: string;
  message?: string | null;
  giftLink: string;
  expiresAt: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const subject = "2MRRW gifted you something special";
  const messageBlock = payload.message?.trim() ? `\n\n"${payload.message.trim()}"\n` : "";
  const expiry = new Date(payload.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const text = `Tomorrow has gifted you: ${payload.itemTitle}${messageBlock}

Claim your gift here:
${payload.giftLink}

This gift expires in 15 days on ${expiry}.

— 2MRRW`;

  if (!resendKey) {
    console.info("[gift-email]", { to: payload.to, giftLink: payload.giftLink });
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.GIFT_EMAIL_FROM || "2MRRW <gifts@2mrrw.com>",
      to: [payload.to],
      subject,
      text
    })
  });

  return { sent: response.ok };
}

export async function sendAdminGift(input: SendGiftInput) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const recipientEmail = normalizeEmail(input.recipient_email);
  const product = await resolveProductId(input.item_type, input.item_id);
  if (!product) {
    throw new Error("Could not resolve storefront product for this gift item.");
  }

  if (!input.force_duplicate) {
    const { data: duplicate } = await supabase
      .from("gifts")
      .select("id, recipient_email")
      .eq("item_id", product.id)
      .ilike("recipient_email", recipientEmail)
      .in("status", ["pending", "claimed"])
      .maybeSingle();

    if (duplicate) {
      return {
        duplicate: true as const,
        message: `You already gifted this to ${recipientEmail}`
      };
    }
  }

  const recipientId = await findRecipientId(recipientEmail);
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

  const { raw: giftTokenRaw, hash: giftTokenHash } = createGiftToken();

  const { data: gift, error } = await supabase
    .from("gifts")
    .insert({
      sender_id: input.sender_id ?? null,
      recipient_id: recipientId,
      recipient_email: recipientEmail,
      recipient_phone: input.recipient_phone ?? null,
      item_type: input.item_type,
      item_id: product.id,
      item_title: input.item_title || product.title,
      message: input.message?.trim() || null,
      expires_at: expiresAt,
      gift_link_token_hash: giftTokenHash,
      gift_link_token: null
    })
    .select("*")
    .single();

  if (error) throw error;

  const giftLink = `${STOREFRONT_URL.replace(/\/+$/, "")}/gift/${giftTokenRaw}`;
  const emailResult = await sendGiftEmail({
    to: recipientEmail,
    itemTitle: gift.item_title || product.title,
    message: input.message,
    giftLink,
    expiresAt: gift.expires_at
  });

  if (emailResult.sent) {
    await supabase.from("gifts").update({ notified_email: true }).eq("id", gift.id);
  }

  return {
    duplicate: false as const,
    success: true,
    gift_link: giftLink,
    expires_at: gift.expires_at,
    gift
  };
}

export async function revokeAdminGift(giftId: string) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: gift, error: fetchError } = await supabase.from("gifts").select("*").eq("id", giftId).maybeSingle();
  if (fetchError) throw fetchError;
  if (!gift) throw new Error("Gift not found");

  if (gift.status === "claimed") {
    await supabase.from("library_items").delete().eq("gift_id", gift.id);
    await supabase.from("purchases").update({ status: "revoked" }).eq("gift_id", gift.id);
    if (gift.recipient_id && gift.item_id) {
      await supabase
        .from("entitlements")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("user_id", gift.recipient_id)
        .eq("resource_type", "product")
        .eq("resource_id", gift.item_id)
        .eq("source_type", "gifted")
        .eq("status", "active");
    }
  }

  const { error: updateError } = await supabase.from("gifts").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", gift.id);
  if (updateError) throw updateError;

  return { success: true };
}

export async function listAdminGifts() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: gifts, error } = await supabase
    .from("gifts")
    .select("id, created_at, claimed_at, recipient_email, item_title, item_type, status, expires_at, gift_link_token")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const { data: claimFeed } = await supabase
    .from("signals")
    .select("id, metadata, created_at")
    .contains("metadata", { kind: "gift_claimed" })
    .order("created_at", { ascending: false })
    .limit(20);

  return { gifts: gifts ?? [], claimFeed: claimFeed ?? [] };
}
