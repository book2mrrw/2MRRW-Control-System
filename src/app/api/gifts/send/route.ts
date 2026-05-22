import { fail, ok, parseJson, requireStudioAccess } from "@/server/http";
import { sendAdminGift, type GiftItemType } from "@/server/gifts/giftService";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  item_type: z.enum(["single", "ep", "album", "deluxe", "collector_card"]),
  item_id: z.string().min(1),
  item_title: z.string().min(1),
  recipient_email: z.string().email(),
  recipient_phone: z.string().optional().nullable(),
  message: z.string().max(280).optional().nullable(),
  force_duplicate: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    requireStudioAccess(request);
    const body = await parseJson(request, bodySchema);

    let senderId: string | null = null;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin") {
        return fail("Admin account required", 403);
      }
      senderId = user.id;
    }

    const result = await sendAdminGift({
      item_type: body.item_type as GiftItemType,
      item_id: body.item_id,
      item_title: body.item_title,
      recipient_email: body.recipient_email,
      recipient_phone: body.recipient_phone,
      message: body.message,
      sender_id: senderId,
      force_duplicate: body.force_duplicate
    });

    if (result.duplicate) {
      return fail(result.message, 409, { code: "duplicate" });
    }

    return ok({
      success: true,
      gift_link: result.gift_link,
      expires_at: result.expires_at,
      gift: result.gift
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not send gift", 400);
  }
}
