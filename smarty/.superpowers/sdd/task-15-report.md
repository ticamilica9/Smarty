# Task 15: SSE Real-time Notifications

## Summary

Implemented real-time notifications via Server-Sent Events (SSE) with Redis pub/sub. When a buyer makes an offer on a product, the seller receives a toast notification in real time. When a seller responds to an RFQ (Request for Quote), the buyer receives a toast notification in real time.

## Files Created

### 1. `src/server/sse.ts` -- Redis pub/sub notification engine
- `sendNotification(userId, notification)` -- Publishes a JSON payload to Redis channel `user:{userId}:notifications`. Uses a singleton Redis publisher connection (lazy-initialized). Fire-and-forget: errors are logged and swallowed so the caller is never affected by a Redis failure.
- `subscribeToNotifications(userId)` -- Returns a `{ subscribe(onMessage) }` object. Each call creates a dedicated Redis subscriber connection (required because Redis pub/sub is stateful per connection). The returned unsubscribe function cleans up the subscription and closes the connection.
- Redis URL defaults to `redis://localhost:6381` (matching the docker-compose host mapping), overridable via `REDIS_URL` env var.

### 2. `src/app/api/sse/route.ts` -- SSE HTTP endpoint
- `GET /api/sse` -- Auth-guarded via `auth()` from `next-auth`. Returns a `ReadableStream` with `Content-Type: text/event-stream`.
- On connect: sends an `event: connected` initialization event.
- Subscribes to the authenticated user's Redis notification channel and forwards each received notification as an `event: notification` SSE event.
- Sends a keepalive comment (`: keepalive`) every 30 seconds to prevent proxy timeouts.
- Cleanup: `req.signal.addEventListener('abort', ...)` tears down the keepalive interval and Redis subscription when the client disconnects.

### 3. `src/components/notifications/notification-provider.tsx` -- Client-side toast provider
- `'use client'` component that creates an `EventSource` connection to `/api/sse`.
- Listens for `notification` events, parses the JSON payload, and displays a sonner toast with title, description, and an optional "Vezi" action button that navigates to the relevant page.
- EventSource auto-reconnects on connection loss (browser built-in behavior).
- Cleans up the connection on unmount.

## Files Modified

### 4. `src/app/layout.tsx` -- Root layout
- Imported `NotificationProvider` and `Toaster` (sonner).
- Wrapped `children` with `NotificationProvider` inside the provider chain.
- Added `<Toaster />` component to render toast popups globally.

### 5. `src/server/api/routers/offer.ts` -- Offer tRPC router
- Imported `sendNotification` from `@/server/sse`.
- In the `create` mutation: after successfully creating the offer, sends a notification to `product.sellerId` with type `OFFER_RECEIVED`, title "Oferta noua", message including the offer amount and product title, and a link to `/cont/oferte`.

### 6. `src/server/api/routers/rfq.ts` -- RFQ tRPC router
- Imported `sendNotification` from `@/server/sse`.
- In the `offer` mutation: after successfully creating the RFQ offer, sends a notification to `rfq.buyerId` with type `RFQ_OFFER_RECEIVED`, title "Oferta la cererea ta", message including the offer amount and RFQ title, and a link to `/cereri/{rfqId}`.

### 7. `.env` -- Environment variables
- Added `REDIS_URL="redis://localhost:6381"` (matching the Redis port mapped in docker-compose.yml).

## Key Design Decisions

- **Fire-and-forget notifications**: `sendNotification` wraps Redis publish in try/catch with `.catch()` at every call site. A Redis outage never breaks an offer or RFQ creation.
- **Singleton publisher, per-connection subscriber**: The Redis publisher is reused across all `sendNotification` calls. Each SSE connection gets its own subscriber because Redis pub/sub requires a dedicated connection for subscribing.
- **SSE over WebSockets**: SSE is simpler to implement, works over standard HTTP, and is sufficient for one-directional server-to-client notification streaming. EventSource handles reconnection automatically.
- **Sonner toasts**: Uses the existing sonner toast library already present in the project, consistent with the rest of the UI.

## Build Status

- Build: **PASS** (Next.js 16.2.9, Turbopack)
- Commit: `a007b01` - `feat: add SSE real-time notifications`
- New endpoint: `GET /api/sse` (auth-guarded, streaming response)
- All notification calls are fire-and-forget: the mutation response is never delayed by or broken by the notification system
