import { subscribe, type EventPayload } from "@/lib/events/eventBus";

const PUBLIC_FRONTEND_ORIGINS = new Set(["https://2mrrw-official.vercel.app"]);

function isAllowedPublicFrontendOrigin(origin: string) {
  if (PUBLIC_FRONTEND_ORIGINS.has(origin)) return true;
  if (/^https:\/\/2mrrw-official-[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function sseCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id"
  });

  if (origin && isAllowedPublicFrontendOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: sseCorsHeaders(request) });
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: EventPayload) => {
        if (closed) return;
        const eventId = event.id ?? `${event.timestamp}`;
        controller.enqueue(
          encoder.encode(`id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
        );
      };

      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({
            type: "connected",
            timestamp: Date.now(),
            data: { heartbeat: true }
          })}\n\n`)
        );
      }, 10000);
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // The stream may already be closed by the runtime.
        }
      };

      request.signal.addEventListener("abort", cleanup, { once: true });

      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({
          type: "connected",
          timestamp: Date.now()
        })}\n\n`)
      );

      return cleanup;
    },
    cancel() {
      // Cleanup also runs from the request abort signal.
    }
  });

  const headers = sseCorsHeaders(request);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");

  return new Response(stream, { headers });
}
