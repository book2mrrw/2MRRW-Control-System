import { createCheckoutSession } from "@/server/stripe/stripeCheckoutService";
import { fail, getAuthenticatedUserId, ok, parseJson } from "@/server/http";
import { z } from "zod";

const checkoutSchema = z.object({ productId: z.string().min(1) });

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = getAuthenticatedUserId(request);
  } catch {
    return fail("Authenticated user identity required", 401);
  }

  const session = await createCheckoutSession(userId, (await parseJson(request, checkoutSchema)).productId);
  return session ? ok(session) : fail("Product not found", 404);
}
