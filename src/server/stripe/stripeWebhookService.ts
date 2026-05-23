import Stripe from "stripe";
import { products } from "@/server/data/seedData";
import { grantProductToUser } from "@/server/entitlements/entitlementResolver";

const processedEventIds = new Set<string>();

export type WebhookResult = {
  eventId: string;
  processed: boolean;
  grantedProductIds: string[];
};

async function parseStripeEvent(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (secretKey && webhookSecret && signature) {
    const stripe = new Stripe(secretKey);
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Stripe webhook signature verification is required in production");
  }

  return JSON.parse(rawBody) as Stripe.Event;
}

export async function handleStripeWebhook(request: Request): Promise<WebhookResult> {
  const event = await parseStripeEvent(request);

  if (processedEventIds.has(event.id)) {
    return { eventId: event.id, processed: false, grantedProductIds: [] };
  }

  processedEventIds.add(event.id);

  if (event.type !== "checkout.session.completed") {
    return { eventId: event.id, processed: true, grantedProductIds: [] };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.userId;
  const productId = session.metadata?.productId;

  if (!userId || !productId || !products.some((product) => product.id === productId)) {
    return { eventId: event.id, processed: true, grantedProductIds: [] };
  }

  const seedGrantsEnabled =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_CONTROL_STRIPE_SEED === "true";

  if (!seedGrantsEnabled) {
    return { eventId: event.id, processed: true, grantedProductIds: [] };
  }

  grantProductToUser(userId, productId);
  return { eventId: event.id, processed: true, grantedProductIds: [productId] };
}
