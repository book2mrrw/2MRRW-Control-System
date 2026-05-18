import { created } from "@/server/http";

export async function POST() {
  return created({
    guestSessionId: `guest_${crypto.randomUUID()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
}
