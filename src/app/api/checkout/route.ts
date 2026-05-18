import { createCheckoutSession } from "@/server/stripe/stripeCheckoutService";
import { fail, getUserId, ok, parseJson } from "@/server/http";
import { z } from "zod";

const checkoutSchema = z.object({ productId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await createCheckoutSession(getUserId(request), (await parseJson(request, checkoutSchema)).productId);
  return session ? ok(session) : fail("Product not found", 404);
}
