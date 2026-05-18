import { products } from "@/server/data/seedData";

export async function createCheckoutSession(userId: string, productId: string) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return null;
  }

  return {
    id: `cs_mock_${product.id}_${userId}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/mock?product=${product.id}`,
    productId: product.id,
    stripePriceId: product.stripePriceId,
    mode: "payment",
    dynamicPaymentMethods: true
  };
}
