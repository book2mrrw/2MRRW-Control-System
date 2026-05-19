import { products } from "@/server/data/seedData";
import Stripe from "stripe";

export async function createCheckoutSession(userId: string, productId: string) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return null;
  }

  if (process.env.STRIPE_SECRET_KEY && product.stripePriceId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: product.grants.some((grant) => grant.type === "membership") ? "subscription" : "payment",
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancelled`,
      metadata: {
        userId,
        productId,
        source: "control-system"
      },
      client_reference_id: userId
    });

    return {
      id: session.id,
      url: session.url,
      productId: product.id,
      stripePriceId: product.stripePriceId,
      mode: session.mode,
      dynamicPaymentMethods: true,
      sourceOfTruth: "stripe_webhook"
    };
  }

  return {
    id: `cs_mock_${product.id}_${userId}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/mock?product=${product.id}&controlSystemMock=1`,
    productId: product.id,
    stripePriceId: product.stripePriceId,
    mode: "payment",
    dynamicPaymentMethods: true,
    mock: true,
    sourceOfTruth: "none",
    grantsAccess: false
  };
}
