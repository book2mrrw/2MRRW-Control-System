import { fail, ok } from "@/server/http";
import { handleStripeWebhook } from "@/server/stripe/stripeWebhookService";

export async function POST(request: Request) {
  try {
    return ok(await handleStripeWebhook(request));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid Stripe webhook", 400);
  }
}
