# Preview Deployments on Vercel — Design Spec

**Date:** 2026-07-07
**Status:** Approved ✅

## Goal

Every branch/PR pushed to the repo automatically gets a unique preview URL (e.g., `https://smarty-git-feat-xyz.vercel.app`) where stakeholders can test the app with a near-complete experience — no real infrastructure required.

## Architecture

A single `PREVIEW_MODE` environment variable gates all mock behavior. When `PREVIEW_MODE=true`:

- Auth: skip OAuth, use 1-click preview accounts
- Database: in-memory store with seed data
- Cart: React Context (localStorage fallback)
- Stripe: mock checkout → fake success page
- Sameday: fake AWB/tracking
- Email: log to console
- S3/MinIO: blocked with toast notification

When `PREVIEW_MODE` is absent or `false`, the app runs normally (no code path changes).

```
┌──────────────────────────────────┐
│         Vercel Preview           │
│      PREVIEW_MODE=true           │
└──────────────┬───────────────────┘
               │
   ┌───────────┼───────────┐
   ▼           ▼           ▼
┌──────┐  ┌────────┐  ┌─────────┐
│Auth  │  │In-Mem  │  │Mock APIs│
│Mock  │  │Store   │  │Stripe/  │
│      │  │+Seed   │  │Sameday/ │
│      │  │        │  │Email/S3 │
└──────┘  └────────┘  └─────────┘
```

## Design Decisions

### 1. Auth — Preview Accounts

- Login page shows "Sign in as Preview User" and "Sign in as Admin" buttons (only when `PREVIEW_MODE=true`)
- Buttons call a dedicated endpoint that creates a NextAuth session with a fake user object
- Preview User: `id: "preview-user"`, `email: "preview@smarty.local"`, `role: "USER"`
- Preview Admin: `id: "preview-admin"`, `email: "admin@smarty.local"`, `role: "ADMIN"`
- No password, no OAuth redirect — one click

### 2. Database — In-Memory Store

- `PreviewStore` class: an in-memory data structure (Map-based) holding all entities
- Seed data loaded on first request in preview mode: categories, ~10 products, admin user
- tRPC context is the injection point — context creation checks `PREVIEW_MODE` and attaches either the real Prisma client or the `PreviewStore`
- Each tRPC router operates on the store interface, unaware whether it's real or mock
- Data lives for the duration of the serverless function instance (warm for ~5-10 min on Vercel free tier)

### 3. Cart — React Context

- A `CartProvider` wraps the app and manages cart state in React Context
- Persisted to localStorage so it survives page refreshes
- Replaces the Redis-backed cart in preview mode only
- Same interface as the real cart, so consuming components don't change

### 4. External Services — Mock Layer

| Service | Mock Behavior |
|---------|--------------|
| Stripe checkout | Redirects to `/checkout/success?mock=true` with fake order ID |
| Stripe webhooks | Not triggered in preview |
| Sameday API | Returns fake AWB number + fake tracking URL |
| Nodemailer | `console.log("[Preview Email]", ...)` instead of sending |
| S3/MinIO upload | Toast "Uploads disabled in preview", file silently ignored |

Each mock is a drop-in replacement at the service level — the calling code is unchanged.

## File Plan

```
smarty/
├── .env.preview                    [NEW] PREVIEW_MODE=true, NEXT_PUBLIC_APP_URL
├── src/
│   ├── lib/
│   │   ├── preview-mode.ts         [NEW] isPreviewMode() helper
│   │   ├── preview-store.ts        [NEW] In-memory DB + seed data
│   │   ├── preview-auth.ts         [NEW] Mock NextAuth provider
│   │   └── preview-services.ts     [NEW] Stripe/Sameday/Email/S3 mocks
│   ├── server/
│   │   └── api/
│   │       └── routers/            [MODIFY] Swappable data source via context
│   ├── components/
│   │   ├── cart/
│   │   │   └── cart-provider.tsx   [NEW] Cart in React Context
│   │   └── auth/
│   │       └── preview-login.tsx   [NEW] Preview login buttons
│   └── app/
│       ├── login/page.tsx          [MODIFY] Show preview login buttons
│       └── checkout/success/
│           └── page.tsx            [MODIFY] Handle mock success param
├── vercel.json                     [NEW] Vercel config with preview env
└── next.config.ts                  [MODIFY] Expose PREVIEW_MODE to client
```

## Vercel Configuration

```json
{
  "build": {
    "env": {
      "PREVIEW_MODE": "true"
    }
  }
}
```

Or via Vercel dashboard:
- Production env: `PREVIEW_MODE` (empty or `false`)
- Preview env: `PREVIEW_MODE=true`

## Out of Scope

- Preview database isolation (seed data is shared across serverless instances via the in-memory store — resets on cold start, which is acceptable)
- Real Stripe test mode in preview
- Preview-specific analytics or logging
- Mobile (Capacitor) preview — web only for now

## Success Criteria

1. Push a branch → Vercel creates a preview URL automatically
2. Open the URL → see the landing page with products from seed data
3. Click "Sign in as Preview User" → logged in, can browse, add to cart
4. Click "Sign in as Admin" → can access admin dashboard
5. Cart persists across page refreshes (localStorage)
6. Checkout completes (mock) → lands on success page with fake order
7. Uploads show toast "disabled in preview"
8. No real emails sent, no real charges made, no real AWB created
