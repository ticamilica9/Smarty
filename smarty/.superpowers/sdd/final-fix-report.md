# Final Review Fix Report

## Fix 1: Stripe webhook marks orders DELIVERED prematurely

**File changed:** `src/app/api/webhooks/stripe/route.ts`

Changed the `payment_intent.succeeded` handler to set order status to `PAID` and payment status to `HELD` instead of `DELIVERED`/`RELEASED`. With manual capture (escrow), this event fires at authorization time — funds are held, not released. Actual release happens via `order.confirmDelivery` after shipping confirmation.

## Fix 2: Duplicate escrow-release procedures

**File changed:** `src/server/api/routers/payment.ts`

Removed the `confirm` procedure from the payment router, which allowed escrow release without shipping validation. The canonical procedure is `order.confirmDelivery` in `src/server/api/routers/order.ts`, which requires `SHIPPED` status before releasing funds. The `releaseEscrow` import was also cleaned up.

## Fix 3: Multi-seller cart checkout — single-item only for MVP

**File changed:** `src/app/(public)/checkout/checkout-form.tsx`

Simplified checkout to handle one item at a time:
- Takes only `items[0]` from the cart
- Removed the multi-payment looping in `PaymentForm` (now handles a single `PaymentInfo`)
- After successful payment, removes the purchased item from cart (via `removeItem`) instead of clearing everything
- Redirects to the order detail page on success
- Shows "Cosul gol" when cart is empty

## Fix 4: Offer acceptance needs payment pathway

**Files changed:**
- `src/server/api/routers/offer.ts` — Removed `product.update({ status: 'SOLD' })` from both `respond` (ACCEPTED) and `acceptCounter` (ACCEPTED) handlers. Products stay ACTIVE until payment is confirmed.
- `src/components/offer/offers-tabs.tsx` — Added a "Plateste" button for accepted offers (buyer perspective) that links to `/checkout?productId=X&offerId=Y`
- `src/server/api/routers/payment.ts` — Added `offerId` field to `createIntent` input items. When present, the procedure finds the existing order created at offer acceptance and creates a PaymentIntent for it (instead of creating a new order). Also added optional `amount` override field.
- `src/app/(public)/checkout/page.tsx` — Reads `productId` and `offerId` search params and passes them to CheckoutForm
- `src/app/(public)/checkout/checkout-form.tsx` — Detects offer-based checkout and passes `offerId` to `createIntent`

## Fix 5: Sameday env vars mismatch

**File changed:** `.env.example`

Replaced `SAMEDAY_CLIENT_ID`/`SAMEDAY_CLIENT_SECRET` with `SAMEDAY_USERNAME`/`SAMEDAY_PASSWORD` to match the actual code in `src/server/sameday.ts`. Added `SAMEDAY_EASYBOX_SERVICE_ID="4"` default.

## Build Result

```
npx tsc --noEmit    ✓ Passed (zero errors)
npm run build       ✓ Passed (zero errors)
```

## Commit

```
859125e fix: resolve 5 critical issues from final review
```
