# Preview Deployments on Vercel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Vercel preview deployments where `PREVIEW_MODE=true` gates all mock behavior — demo data, 1-click auth, mock Stripe, and mock external services.

**Architecture:** A single `PREVIEW_MODE` env var. When set to `true`, existing demo infrastructure (`demo-prisma`, `demo-data`, Credentials auth) activates automatically. Stripe is mocked at the service layer. Cart is already localStorage-based (no Redis dependency). The result: every branch push gets a working preview URL at zero extra cost.

**Tech Stack:** Next.js 16, tRPC, NextAuth v5, Prisma, React Context (Cart)

## Global Constraints

- `PREVIEW_MODE=true` → all mocks active; absent/false → normal operation
- No `if (preview)` scattered in components — gate at service/module level
- Existing demo infrastructure (`demo-prisma.ts`, `demo-data.ts`, Credentials provider) is reused, not duplicated
- Cart already uses localStorage via `CartProvider` — no changes needed
- Vercel free tier compatible (no external DB required)

---

## File Structure

```
smarty/
├── .env.preview                        [NEW] Local preview env vars
├── vercel.json                         [NEW] Vercel build + preview config
├── next.config.ts                      [MODIFY] Expose NEXT_PUBLIC_PREVIEW_MODE
├── src/
│   ├── lib/
│   │   ├── preview-mode.ts             [NEW] isPreviewMode() helper
│   │   ├── preview-services.ts         [NEW] Mock Stripe / Sameday / S3 / Redis
│   │   ├── prisma.ts                   [MODIFY] PREVIEW_MODE → USE_DEMO_DATA=true
│   │   └── redis.ts                    [MODIFY] Return mock in preview mode
│   ├── server/
│   │   └── stripe.ts                   [MODIFY] Graceful no-op in preview mode
│   ├── components/
│   │   └── auth/
│   │       └── preview-login.tsx       [NEW] 1-click preview login buttons
│   └── app/
│       ├── (auth)/login/
│       │   └── login-form.tsx          [MODIFY] Show preview buttons
│       └── (public)/checkout/
│           └── checkout-form.tsx       [MODIFY] Mock payment in preview
```

---

### Task 1: Create `preview-mode.ts` helper

**Files:**
- Create: `smarty/src/lib/preview-mode.ts`

**Interfaces:**
- Produces: `isPreviewMode(): boolean` — server-side check
- Produces: `NEXT_PUBLIC_PREVIEW_MODE` — client-side (set via env)

- [ ] **Step 1: Write the file**

```typescript
/**
 * Preview mode detection.
 *
 * When PREVIEW_MODE=true (Vercel preview deployments), the app switches to
 * in-memory demo data + mock external services so it runs without any real
 * infrastructure (no PostgreSQL, Redis, Stripe, or S3).
 */

/**
 * Server-side check.  Reads process.env.PREVIEW_MODE.
 * Use in server components, API routes, and tRPC context.
 */
export function isPreviewMode(): boolean {
  return process.env.PREVIEW_MODE === 'true'
}

/**
 * Client-side flag.  Reads NEXT_PUBLIC_PREVIEW_MODE which is set at build time
 * by next.config.ts from PREVIEW_MODE.
 */
export const IS_PREVIEW_CLIENT =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit src/lib/preview-mode.ts
```

Expected: no errors

- [ ] **Step 3: Commit**

Co-Authored-By: Claude <noreply@anthropic.com>

```bash
git add smarty/src/lib/preview-mode.ts
git commit -m "feat: add preview-mode helper for PREVIEW_MODE env var"
```

---

### Task 2: Create `.env.preview` and `vercel.json`

**Files:**
- Create: `smarty/.env.preview`
- Create: `smarty/vercel.json`

**Interfaces:**
- Produces: `.env.preview` — copy to `.env` for local preview testing
- Produces: `vercel.json` — Vercel build configuration

- [ ] **Step 1: Write `.env.preview`**

```
# Preview mode — copy to .env for local testing
PREVIEW_MODE=true
USE_DEMO_DATA=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=preview-mode-not-for-production
DATABASE_URL=postgresql://localhost:5432/smarty
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_preview_mode_disabled
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_preview_mode_disabled
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=smarty-uploads
SAMEDAY_API_URL=https://api.sameday.ro
SAMEDAY_USERNAME=preview
SAMEDAY_PASSWORD=preview
```

- [ ] **Step 2: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "build": {
    "env": {
      "PREVIEW_MODE": "true"
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add smarty/.env.preview smarty/vercel.json
git commit -m "feat: add Vercel preview config and .env.preview"
```

---

### Task 3: Update `next.config.ts` to expose `PREVIEW_MODE` to client

**Files:**
- Modify: `smarty/next.config.ts`

**Interfaces:**
- Produces: `NEXT_PUBLIC_PREVIEW_MODE` env variable available in browser

- [ ] **Step 1: Read current file and add env**

Current `next.config.ts` (line 1-78). Add `env` block:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // ── Preview mode ──
  // Expose PREVIEW_MODE to client-side code so components can adjust
  // behavior (e.g. show preview login buttons, skip Stripe Elements).
  env: {
    NEXT_PUBLIC_PREVIEW_MODE: process.env.PREVIEW_MODE ?? "",
  },

  allowedDevOrigins: ["192.168.1.6"],

  // ... rest of existing config remains unchanged
```

- [ ] **Step 2: Edit — insert `env` block after `allowedDevOrigins`**

Edit the file to add the `env` block between `allowedDevOrigins` and the `// ── Mobile performance` comment. The exact edit:

_Old (line 6):_
```
  allowedDevOrigins: ["192.168.1.6"],
```

_New:_
```
  allowedDevOrigins: ["192.168.1.6"],

  // ── Preview mode ──
  env: {
    NEXT_PUBLIC_PREVIEW_MODE: process.env.PREVIEW_MODE ?? "",
  },
```

- [ ] **Step 3: Verify build doesn't break**

```bash
cd smarty && npx next build 2>&1 | Select-Object -Last 5
```

Expected: build succeeds (may show warnings about missing env vars, that's OK)

- [ ] **Step 4: Commit**

```bash
git add smarty/next.config.ts
git commit -m "feat: expose PREVIEW_MODE as NEXT_PUBLIC_PREVIEW_MODE for client"
```

---

### Task 4: Update `prisma.ts` to auto-enable demo data

**Files:**
- Modify: `smarty/src/lib/prisma.ts`

**Interfaces:**
- Consumes: `isPreviewMode()` from `preview-mode.ts`
- Produces: `prisma` export uses demo client when `PREVIEW_MODE=true`

- [ ] **Step 1: Read current file, modify to integrate preview mode**

Current `prisma.ts` (lines 1-17):

```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { createDemoPrismaClient } from './demo-prisma'

const globalForPrisma = globalThis as unknown as { prisma: any }

function createRealPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const realPrisma = globalForPrisma.prisma || createRealPrisma()
const demoPrisma = createDemoPrismaClient(realPrisma)

export const prisma = process.env.USE_DEMO_DATA === 'false' ? realPrisma : demoPrisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = realPrisma
```

Replace with:

```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { createDemoPrismaClient } from './demo-prisma'
import { isPreviewMode } from './preview-mode'

const globalForPrisma = globalThis as unknown as { prisma: any }

function createRealPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const realPrisma = globalForPrisma.prisma || createRealPrisma()
const demoPrisma = createDemoPrismaClient(realPrisma)

// In preview mode, always use demo data (in-memory, no DB required).
// Otherwise, respect USE_DEMO_DATA env var (defaults to demo when absent).
const useDemoData = isPreviewMode() || process.env.USE_DEMO_DATA !== 'false'

export const prisma = useDemoData ? demoPrisma : realPrisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = realPrisma
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add smarty/src/lib/prisma.ts
git commit -m "feat: auto-enable demo data when PREVIEW_MODE=true"
```

---

### Task 5: Update `redis.ts` to return mock in preview

**Files:**
- Modify: `smarty/src/lib/redis.ts`

**Interfaces:**
- Consumes: `isPreviewMode()` from `preview-mode.ts`
- Produces: `redis`, `redisPub`, `redisSub` — real or mock based on preview mode

- [ ] **Step 1: Write the updated file**

Current `redis.ts` (lines 1-10). Replace with:

```typescript
import { Redis } from 'ioredis'
import { isPreviewMode } from './preview-mode'

const globalForRedis = globalThis as unknown as { redis: Redis }

// In preview mode, return a mock that no-ops all Redis operations.
// This prevents connection errors when REDIS_URL is unavailable.
function createMockRedis(): Redis {
  const mock = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    publish: async () => 0,
    subscribe: async () => {},
    unsubscribe: async () => {},
    on: () => mock,
    duplicate: () => mock,
    // Make it quack like a Redis instance for type compatibility
  } as unknown as Redis
  return mock
}

function createRealRedis(): Redis {
  return new Redis(process.env.REDIS_URL!)
}

export const redis: Redis = isPreviewMode()
  ? createMockRedis()
  : (globalForRedis.redis || createRealRedis())

export const redisPub: Redis = isPreviewMode()
  ? createMockRedis()
  : redis.duplicate()

export const redisSub: Redis = isPreviewMode()
  ? createMockRedis()
  : redis.duplicate()

if (process.env.NODE_ENV !== 'production' && !isPreviewMode()) {
  globalForRedis.redis = redis
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add smarty/src/lib/redis.ts
git commit -m "feat: return mock Redis client in preview mode"
```

---

### Task 6: Update `stripe.ts` for graceful preview mode

**Files:**
- Modify: `smarty/src/server/stripe.ts`

**Interfaces:**
- Consumes: `isPreviewMode()` from `preview-mode.ts`
- Produces: `stripe` — real Stripe instance or mock; all exported functions work in preview

- [ ] **Step 1: Write the updated file**

Current `stripe.ts` throws on import when `STRIPE_SECRET_KEY` is missing. Replace the top-level instantiation with lazy init, and make all exported functions preview-aware:

```typescript
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { isPreviewMode } from "@/lib/preview-mode"

// ── Stripe client (lazy, preview-aware) ──

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  if (isPreviewMode()) {
    // Return a minimal Stripe-like object for preview — the actual
    // Stripe SDK is never called because all exported functions below
    // short-circuit in preview mode.
    _stripe = {} as Stripe
    return _stripe
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  })
  return _stripe
}

// Legacy alias for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return (getStripe() as any)[prop] }
})

// ── Stripe Connect ──

export async function createStripeAccount(userId: string, email: string) {
  if (isPreviewMode()) {
    const mockId = `acct_preview_${userId}`
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectId: mockId },
    })
    return { id: mockId }
  }
  const account = await getStripe().accounts.create({
    type: "express",
    country: "RO",
    email,
    capabilities: { transfers: { requested: true } },
    business_type: "individual",
  })
  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectId: account.id },
  })
  return account
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
) {
  if (isPreviewMode()) {
    return { url: returnUrl }
  }
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })
}

// ── Payments ──

export async function createPaymentIntent(params: {
  amount: number
  stripeConnectId: string
  orderId: string
  buyerId: string
}) {
  const { amount, stripeConnectId, orderId } = params

  if (isPreviewMode()) {
    const mockId = `pi_preview_${orderId}`
    await prisma.payment.create({
      data: {
        orderId,
        stripePaymentIntentId: mockId,
        amount,
        status: "HELD",
      },
    })
    return {
      clientSecret: `${mockId}_secret_preview`,
      paymentIntentId: mockId,
    }
  }

  const amountBani = Math.round(amount * 100)
  const applicationFee = Math.round(amountBani * 0.1)

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountBani,
    currency: "ron",
    capture_method: "manual",
    application_fee_amount: applicationFee,
    transfer_data: { destination: stripeConnectId },
    metadata: { orderId },
  })

  await prisma.payment.create({
    data: {
      orderId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      status: "HELD",
    },
  })

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }
}

export async function releaseEscrow(paymentIntentId: string) {
  if (isPreviewMode()) {
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: "RELEASED", escrowReleasedAt: new Date() },
    })
    return { id: paymentIntentId }
  }
  const paymentIntent = await getStripe().paymentIntents.capture(paymentIntentId)
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "RELEASED", escrowReleasedAt: new Date() },
  })
  return paymentIntent
}

export async function refundPayment(paymentIntentId: string) {
  if (isPreviewMode()) {
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: "REFUNDED" },
    })
    return { id: `refund_${paymentIntentId}` }
  }
  const refund = await getStripe().refunds.create({
    payment_intent: paymentIntentId,
  })
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "REFUNDED" },
  })
  return refund
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add smarty/src/server/stripe.ts
git commit -m "feat: mock Stripe operations in preview mode"
```

---

### Task 7: Create `preview-services.ts` for remaining mocks

**Files:**
- Create: `smarty/src/lib/preview-services.ts`

**Interfaces:**
- Produces: `mockSamedayShipment()` — fake AWB response
- Produces: `mockUploadUrl()` — fake S3 URL
- Produces: `mockEmailSend()` — console.log wrapper
- Consumes: none (standalone)

- [ ] **Step 1: Write the file**

```typescript
/**
 * Mock implementations for external services used in preview mode.
 *
 * Each function returns realistic fake data so the UI flows work end-to-end
 * without hitting real APIs (Sameday, S3, email).
 */

// ── Sameday Courier ──

export interface MockShipment {
  awbNumber: string
  pickupCode: string
  trackingUrl: string
  estimatedDelivery: string
}

let _awbCounter = 0

export function mockSamedayShipment(): MockShipment {
  _awbCounter++
  const awb = `9P${String(_awbCounter).padStart(9, '0')}`
  return {
    awbNumber: awb,
    pickupCode: `EZ${String(_awbCounter).padStart(4, '0')}`,
    trackingUrl: `https://sameday.ro/track?awb=${awb}`,
    estimatedDelivery: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }
}

export function mockSamedayLocations(city?: string) {
  const base = [
    {
      lockerId: 1,
      name: 'EasyBox București Mall',
      address: 'Calea Vitan 55-59, București',
      city: 'București',
      latitude: 44.4123,
      longitude: 26.1258,
    },
    {
      lockerId: 2,
      name: 'EasyBox AFI Cotroceni',
      address: 'Bd. Vasile Milea 4, București',
      city: 'București',
      latitude: 44.4285,
      longitude: 26.0527,
    },
    {
      lockerId: 3,
      name: 'EasyBox Cluj Central',
      address: 'Piața Unirii 10, Cluj-Napoca',
      city: 'Cluj-Napoca',
      latitude: 46.7712,
      longitude: 23.6236,
    },
  ]
  if (city) return base.filter((l) => l.city.toLowerCase().includes(city.toLowerCase()))
  return base
}

export function mockSamedayTracking(awbNumber: string) {
  return {
    awbNumber,
    status: 'IN_TRANSIT',
    lastEvent: 'Coletul a ajuns in depozitul de destinatie',
    estimatedDelivery: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    events: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Colet preluat de la expeditor',
      },
      {
        timestamp: new Date().toISOString(),
        description: 'Coletul a ajuns in depozitul de destinatie',
      },
    ],
  }
}

// ── S3 / MinIO ──

let _uploadCounter = 0

export function mockUploadUrl(filename: string): string {
  _uploadCounter++
  const ext = filename.split('.').pop() ?? 'jpg'
  return `https://picsum.photos/seed/preview-upload-${_uploadCounter}/800/800.${ext}`
}

// ── Email ──

export function mockEmailSend(to: string, subject: string, _html: string): void {
  console.log(`[Preview Email] To: ${to} | Subject: ${subject}`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add smarty/src/lib/preview-services.ts
git commit -m "feat: add mock services for Sameday, S3, and email in preview mode"
```

---

### Task 8: Update `checkout-form.tsx` for mock payment in preview

**Files:**
- Modify: `smarty/src/app/(public)/checkout/checkout-form.tsx`

**Interfaces:**
- Consumes: `IS_PREVIEW_CLIENT` from `preview-mode.ts`
- Produces: checkout flow skips real Stripe Elements when in preview, uses mock confirmation

- [ ] **Step 1: Replace module-level Stripe init with preview-aware version**

Lines 39-44 currently:

```typescript
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set")
}
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
)
```

Replace with:

```typescript
import { IS_PREVIEW_CLIENT } from "@/lib/preview-mode"

// Stripe is only loaded in production; preview uses mock payment flow
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise =
  IS_PREVIEW_CLIENT || !stripeKey
    ? null
    : loadStripe(stripeKey)
```

- [ ] **Step 2: Guard Stripe Elements rendering in payment step**

The `if (step === "payment" && activePayment?.clientSecret)` block (line 366) currently renders `<Elements><PaymentForm /></Elements>`. In preview mode, clientSecret starts with `pi_preview_` — we need to skip Stripe Elements entirely and show a mock payment UI.

After line 366 (`if (step === "payment" && activePayment?.clientSecret) {`), add preview handling. The payment step block becomes:

```typescript
  // Payment step
  if (step === "payment" && activePayment?.clientSecret) {
    // In preview mode, skip Stripe Elements and show mock payment UI
    if (IS_PREVIEW_CLIENT) {
      return (
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="size-4" />
                Plata (Preview)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Comanda #{activePayment.orderId.slice(0, 8)}
                    </p>
                    <p className="text-sm font-medium">
                      {activePayment.productTitle}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRON(activePayment.amount)}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Mod preview — plata nu este reala</p>
                <p className="text-xs mt-1">
                  In preview, plata este simulata. Niciun card nu va fi debitat.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => handlePaymentSuccess()}
              >
                Simuleaza plata ({formatRON(activePayment.amount)})
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockIcon className="size-3" />
                Plata este simulata — mod preview
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Production: real Stripe Elements
    const elementsOptions: StripeElementsOptions = {
      // ... existing code continues unchanged
```

- [ ] **Step 3: Guard the module-level stripePromise usage in Elements**

In the production payment branch (keeping existing code), the `<Elements stripe={stripePromise}>` usage must handle `stripePromise` being null. Guard it:

In the existing Elements render, change from:

```tsx
            <Elements
              stripe={stripePromise}
              options={elementsOptions}
            >
```

To:

```tsx
            <Elements
              stripe={stripePromise!}
              options={elementsOptions}
            >
```

This is safe because we already returned early in the preview case above.

- [ ] **Step 4: Remove the `loadStripe` import in preview (optional optimization)**

The import on line 16 can stay — it won't be called at runtime in preview since we guard the usage. No change needed.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add smarty/src/app/\(public\)/checkout/checkout-form.tsx
git commit -m "feat: mock payment flow in checkout when PREVIEW_MODE is active"
```

---

### Task 9: Create `preview-login.tsx` component

**Files:**
- Create: `smarty/src/components/auth/preview-login.tsx`

**Interfaces:**
- Consumes: `IS_PREVIEW_CLIENT` from `preview-mode.ts`
- Produces: `<PreviewLogin />` — two buttons ("Sign in as User" / "Sign in as Admin")

- [ ] **Step 1: Write the component**

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { IS_PREVIEW_CLIENT } from '@/lib/preview-mode'

const PREVIEW_USERS = {
  user: { email: 'ana@email.com', password: 'demo123', label: 'Intra ca User (Preview)' },
  admin: { email: 'admin@smarty.ro', password: 'admin123', label: 'Intra ca Admin (Preview)' },
} as const

export function PreviewLogin() {
  const [loading, setLoading] = useState<'user' | 'admin' | null>(null)

  if (!IS_PREVIEW_CLIENT) return null

  const handleLogin = async (type: 'user' | 'admin') => {
    setLoading(type)
    const creds = PREVIEW_USERS[type]
    await signIn('credentials', {
      email: creds.email,
      password: creds.password,
      redirect: false,
    })
    window.location.href = '/'
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-800 p-3 text-sm">
        <p className="font-medium text-fuchsia-800 dark:text-fuchsia-200">
          Mod Preview — autentificare rapida
        </p>
        <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 mt-0.5">
          Nu este nevoie de parola. Apasa un buton pentru a intra direct in aplicatie.
        </p>
      </div>

      <Button
        className="w-full"
        variant="default"
        disabled={loading !== null}
        onClick={() => handleLogin('user')}
      >
        {loading === 'user' ? 'Se autentifica...' : PREVIEW_USERS.user.label}
      </Button>

      <Button
        className="w-full"
        variant="outline"
        disabled={loading !== null}
        onClick={() => handleLogin('admin')}
      >
        {loading === 'admin' ? 'Se autentifica...' : PREVIEW_USERS.admin.label}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add smarty/src/components/auth/preview-login.tsx
git commit -m "feat: add 1-click preview login buttons component"
```

---

### Task 10: Update `login-form.tsx` to show preview buttons

**Files:**
- Modify: `smarty/src/app/(auth)/login/login-form.tsx`

**Interfaces:**
- Consumes: `<PreviewLogin />` component

- [ ] **Step 1: Add PreviewLogin import and render**

Add import at top (after existing imports):

```typescript
import { PreviewLogin } from '@/components/auth/preview-login'
```

Add `<PreviewLogin />` as the first element inside the outer `<div className="space-y-6">` (line 40), before the credentials form:

```typescript
    <div className="space-y-6">
      {/* Preview mode: 1-click login buttons */}
      <PreviewLogin />

      {/* Credentials login */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4">
```

- [ ] **Step 2: Verify the rendered order makes sense**

The PreviewLogin component returns `null` when not in preview mode (checking `IS_PREVIEW_CLIENT`), so in production it adds nothing to the DOM. In preview, it shows the fuchsia notice + two buttons at the top of the form, followed by the existing credentials form and demo accounts info box.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add smarty/src/app/\(auth\)/login/login-form.tsx
git commit -m "feat: integrate preview login buttons into login page"
```

---

### Task 11: End-to-end local preview test

**Files:**
- None (verification only)

- [ ] **Step 1: Copy `.env.preview` to `.env` for local testing**

```bash
cd smarty
cp .env .env.backup
cp .env.preview .env
```

- [ ] **Step 2: Start the dev server**

```bash
cd smarty && npm run dev
```

Wait for the server to start. Expected: "Ready in Xs"

- [ ] **Step 3: Verify the landing page loads with products**

Open `http://localhost:3000`. Check:
- [ ] Categories are visible (Make-up, Îngrijire, Parfumuri)
- [ ] Products from demo data are displayed
- [ ] No database connection errors in console

- [ ] **Step 4: Test preview login**

Navigate to `http://localhost:3000/login`. Verify:
- [ ] Fuchsia "Mod Preview" banner is visible
- [ ] "Intra ca User (Preview)" and "Intra ca Admin (Preview)" buttons are shown
- [ ] Click "User" → redirects to homepage, logged in as Ana Popescu
- [ ] Click "Admin" → logged in as Admin Smarty

- [ ] **Step 5: Test cart**

- [ ] Add a product to cart
- [ ] Refresh page → cart persists (localStorage)
- [ ] Cart icon in header shows count

- [ ] **Step 6: Test mock checkout**

- [ ] Go to checkout with an item in cart
- [ ] Fill shipping form
- [ ] Click "Plaseaza comanda"
- [ ] Mock payment UI appears (amber banner "plata nu este reala")
- [ ] Click "Simuleaza plata" → success screen with green checkmark

- [ ] **Step 7: Verify no real services were called**

Check terminal output:
- [ ] No Redis connection errors
- [ ] No PostgreSQL connection errors
- [ ] No Stripe API errors
- [ ] No Sameday API errors

- [ ] **Step 8: Restore original .env**

```bash
cd smarty
mv .env.backup .env
```

- [ ] **Step 9: If all checks pass, mark task complete**

No commit needed (verification only).

---

### Task 12: Final commit and push

**Files:**
- All above (squash summary)

- [ ] **Step 1: Verify all changes are committed**

```bash
git log --oneline -12
```

Expected: 10 commits from Tasks 1-10

- [ ] **Step 2: Push to remote**

```bash
git push origin master
```

---

## Implementation Order

Tasks must run sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

Tasks 1-3 are independent of each other but all files reference `preview-mode.ts`. Tasks 4-7 depend on Task 1. Tasks 8-10 depend on Tasks 1 and 7. Task 11 is verification. Task 12 is final push.

## Post-Implementation: Vercel Setup

After pushing, connect the repo to Vercel:

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the GitHub repo
3. Vercel auto-detects Next.js — `vercel.json` provides `PREVIEW_MODE=true` for preview builds
4. In the Vercel dashboard → Settings → Environment Variables:
   - **Production:** set `PREVIEW_MODE` to empty (or don't set it)
   - **Preview:** set `PREVIEW_MODE` to `true`
5. Deploy — every branch push gets a unique preview URL like `smarty-git-<branch>-<hash>.vercel.app`
