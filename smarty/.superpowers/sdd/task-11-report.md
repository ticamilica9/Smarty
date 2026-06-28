# Task 11: Stripe Connect Payments with Escrow

## Summary

Implemented Stripe Connect payments with escrow flow for the Smarty C2C marketplace. Buyers pay with card, funds are held until delivery is confirmed, then released to sellers minus a 10% platform fee.

## Files Created

- **`src/server/stripe.ts`** -- Stripe client (API v2026-06-24.dahlia) with helpers:
  - `createStripeAccount(userId, email)` -- creates Express connected account for sellers
  - `createAccountLink(accountId, refreshUrl, returnUrl)` -- generates Stripe onboarding links
  - `createPaymentIntent(amount, stripeConnectId, orderId)` -- creates PaymentIntent with manual capture (escrow), 10% application_fee, and transfer_data[destination]
  - `releaseEscrow(paymentIntentId)` -- captures the PaymentIntent, releasing funds to seller
  - `refundPayment(paymentIntentId)` -- refunds the full PaymentIntent

- **`src/server/api/routers/payment.ts`** -- tRPC payment router with 3 procedures:
  - `createIntent` (protected) -- groups cart items by seller, creates Orders, creates PaymentIntents per order. Returns client secrets for Stripe Elements.
  - `confirm` (protected) -- buyer confirms delivery. Validates ownership/status, calls releaseEscrow, updates Order to DELIVERED.
  - `getStripeConnectLink` (protected) -- creates Stripe account if needed, returns onboarding URL for sellers.

- **`src/app/api/webhooks/stripe/route.ts`** -- Stripe webhook handler:
  - `payment_intent.succeeded` -- updates Payment to RELEASED, Order to DELIVERED
  - `payment_intent.payment_failed` -- marks Payment as REFUNDED
  - `account.updated` -- logs account status changes (payouts_enabled)

## Files Modified

- **`src/server/api/root.ts`** -- added `paymentRouter` to appRouter
- **`src/app/(public)/checkout/checkout-form.tsx`** -- integrated Stripe Elements PaymentElement:
  - 4-step flow: form -> processing -> payment -> success
  - Calls `payment.createIntent` on submit, mounts Stripe Elements with client secret
  - Handles empty cart, error, and success states
  - Processes multiple PaymentIntents sequentially per order
- **`.env`** -- added STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## Dependencies Added

- `@stripe/react-stripe-js` -- React components for Stripe Elements
- `@stripe/stripe-js` -- Stripe.js client

## Key Design Decisions

- **Escrow via manual capture**: PaymentIntent with `capture_method: 'manual'` holds funds. `releaseEscrow()` calls `capture()` to release to seller via `transfer_data[destination]`.
- **10% platform fee**: Applied via `application_fee_amount` on the PaymentIntent, deducted at capture time.
- **One PaymentIntent per order**: Each order gets its own PaymentIntent with the seller's connected account as destination. This keeps Stripe Connect transfers clean.
- **Multi-seller carts supported**: Cart items are grouped by seller during `createIntent`, creating separate orders and PaymentIntents per seller. Frontend processes them sequentially.
- **Currency**: RON (ron), consistent with the rest of the app.

## Build Status

- Build: **PASS** (Next.js 16.2.9, TypeScript check passed)
- Commit: `cdcf7f8` - `feat: add Stripe Connect payments with escrow`
