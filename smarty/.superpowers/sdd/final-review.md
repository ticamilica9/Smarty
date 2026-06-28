## Summary

The Smarty Marketplace codebase implements the three core buying mechanisms (direct purchase, negotiation, RFQ) with a well-structured Next.js 15 + tRPC + Prisma stack. The schema, Stripe Connect escrow, Sameday shipping, and SSE notifications are all wired up. However, the codebase has several production-blocking issues, most critically around the Stripe webhook handler that prematurely marks orders as delivered, a broken multi-seller payment flow in checkout, duplicate escrow-release procedures with conflicting validation, and missing post-offer-acceptance payment orchestration. These must be addressed before any production deployment.

---

## Critical Issues

### C1. Stripe Webhook `payment_intent.succeeded` Prematurely Marks Orders DELIVERED

**File:** `src/app/api/webhooks/stripe/route.ts` (lines 28-54)
**Severity:** Critical -- breaks the entire escrow model

The webhook handler for `payment_intent.succeeded` immediately updates Payment status to `RELEASED` and Order status to `DELIVERED`. With `capture_method: "manual"`, Stripe fires `payment_intent.succeeded` on *authorization* (when the buyer completes checkout), NOT on capture/release. This means every order is marked "delivered" seconds after payment, before the seller has even seen the order, let alone shipped it. The escrow model described in the spec requires funds to remain HELD until the buyer confirms receipt.

**Fix:** Remove the automatic `DELIVERED`/`RELEASED` transition from this handler. The `payment_intent.succeeded` event should only confirm that the payment was authorized (update Order from CREATED to PAID). Release should only happen via the explicit `order.confirmDelivery` or `payment.confirm` mutations. If Stripe sends a `payment_intent.captured` event post-capture, that can be used as a secondary confirmation.

### C2. Duplicate Escrow-Release Procedures with Conflicting Validation

**Files:**
- `src/server/api/routers/payment.ts` -- `payment.confirm` (lines 193-248)
- `src/server/api/routers/order.ts` -- `order.confirmDelivery` (lines 138-192)
- `src/server/api/routers/payment.ts` -- `payment.createIntent` (lines 18-186)

The `payment.confirm` and `order.confirmDelivery` mutations both release escrow and mark the order as DELIVERED, but they have **different and incompatible preconditions**:

- `payment.confirm` (line 218): checks `order.status !== "PAID" && order.status !== "CREATED"` -- meaning it allows releasing escrow when the order is still in CREATED or PAID status, before shipping.
- `order.confirmDelivery` (line 162): correctly checks `order.status !== "SHIPPED"` -- requiring the order to be shipped before delivery can be confirmed.

Additionally, `payment.confirm` does NOT update the Payment record's `escrowReleasedAt` field (it calls `releaseEscrow` which does, but the order update happens outside the transaction used by `order.confirmDelivery`).

**Fix:** Eliminate the duplication. Keep `order.confirmDelivery` (which has correct validation) and remove or redirect `payment.confirm` to it. Ensure the Stripe capture and database updates happen atomically in a single `$transaction`.

### C3. Multi-Seller Cart Checkout Payment Flow is Broken

**Files:**
- `src/app/(public)/checkout/checkout-form.tsx` (lines 263, 327-361)
- `src/server/api/routers/payment.ts` -- `payment.createIntent`

When a cart contains products from multiple sellers, `payment.createIntent` correctly creates separate Orders and separate PaymentIntents per seller/product. However, the checkout form only provides the first payment's `clientSecret` as the `Elements` provider value:

```
const activeClientSecret = payments[0]?.clientSecret
```

The `PaymentForm` component attempts to iterate through multiple payments, but the `Elements` wrapper retains the first PaymentIntent's `clientSecret` throughout. After the first payment confirms, the Elements provider still points to the first (now confirmed) intent, so subsequent payments fail -- they try to use an already-confirmed PaymentIntent. Multi-seller carts are effectively non-functional.

**Fix:** Either (a) refactor to create a single combined PaymentIntent per seller that includes all their items, or (b) restructure the payment flow to re-initialize Elements with each new clientSecret as the user progresses through payments.

### C4. Offer Acceptance Creates Order Without Payment Flow

**File:** `src/server/api/routers/offer.ts` (lines 240-271, 331-358)

When a seller accepts an offer (or buyer accepts a counter-offer), an Order is created with status CREATED and the product is marked SOLD, but **no PaymentIntent is created and there is no mechanism for the buyer to pay**. The spec says the flow should be: "Order created -> POST /api/trpc/payment.createIntent -> Buyer pays -> funds held in escrow." Without this, the buyer has no way to complete payment for an accepted offer.

**Fix:** After creating the Order in the offer-acceptance transaction, trigger PaymentIntent creation (or return the order ID so the front end can call `payment.createIntent`). The product should also NOT be marked SOLD until payment is confirmed -- SOLD should transition on PAID status, not on offer acceptance.

### C5. Sameday Uses Different Env Vars Than Documented

**File:** `src/server/sameday.ts` (lines 1-3)
**Reference:** `.env.example` (lines 14-16)

The `.env.example` documents `SAMEDAY_CLIENT_ID` and `SAMEDAY_CLIENT_SECRET`, but the Sameday client reads `SAMEDAY_USERNAME` and `SAMEDAY_PASSWORD`. The Sameday API is also missing a value for `SAMEDAY_EASYBOX_SERVICE_ID` (listed as `""` via env), defaulting to `4` in code. Anyone following the `.env.example` will find Sameday auth broken.

**Fix:** Align the environment variables -- either change the code to use `SAMEDAY_CLIENT_ID`/`SAMEDAY_CLIENT_SECRET`, or fix `.env.example` to match the code. The `SAMEDAY_EASYBOX_SERVICE_ID` should have a documented default.

---

## Important Issues

### I1. Missing Escrow Auto-Release After 72 Hours

**Spec reference:** Section 6.4, item 5: "Daca buyer nu confirma in 72h de la livrare: auto-release"

There is no cron job, scheduled task, or background worker that auto-releases escrow when the 72-hour window expires. If a buyer never clicks "confirm delivery", funds are stuck in escrow permanently. This needs a background process (e.g., a cron job or Bull queue) that queries payments with status HELD where `updatedAt + 72h < now()` and captures them.

### I2. Checkout Shipping Address Data is Collected But Never Saved

**File:** `src/app/(public)/checkout/checkout-form.tsx`

The checkout form collects city, address, postal code, phone, and shipping method (courier/EasyBox), but this data is never persisted to any database table, attached to the order, or passed to the Sameday API. The `createIntent` mutation accepts only product items. The shipping method selection is purely cosmetic.

**Fix:** Either save the address to `UserAddress` and link it to the Order, or at minimum store shipping details on the Order/Shipping record. Pass recipient details to Sameday's `createEasyboxShipment`.

### I3. Sameday Authentication Caching Creates Race Condition

**File:** `src/server/sameday.ts` (lines 79-111, 113-115)

The `authHeaders()` function reads a module-level `cachedToken` without synchronizing with `getToken()`. If two requests call `getToken()` concurrently (e.g., two lockers queries arriving simultaneously), both could attempt to refresh the token, potentially overwriting each other. Additionally, `authHeaders()` returns `Bearer ${cachedToken ?? ""}` -- if called before any `getToken()` call completes, it sends an empty token.

**Fix:** Use a simple promise-based lock around token refresh, or use an async mutex pattern. Consider a single exported `authenticatedFetch` wrapper.

### I4. RFQ Acceptance Requires productId, Breaking Spec Flow

**File:** `src/server/api/routers/rfq.ts` (lines 446-451)

When accepting an RFQ offer, if `offer.productId` is null, the mutation throws `"Oferta trebuie sa includa un produs pentru a crea comanda"`. But the schema and spec allow sellers to submit offers without linking to a specific product. This forces all RFQ offers to require a product, which contradicts the spec's description ("Vanzatorii vad cererile active si trimit oferte").

**Fix:** The Order schema requires a `productId`. For offers without a linked product, consider creating a minimal "placeholder" product entry, or restructure the Order schema to allow nullable `productId` for RFQ-based orders.

### I5. No Admin Audit Trail for Dispute Resolution

**File:** `src/server/api/routers/admin.ts`

The admin dispute resolution mutations (`forceReturn`, `forceRelease`, `resolveDispute`) execute financial actions (refunds, captures) with no audit log. There is no record of which admin took what action, when, or why. For a marketplace handling real-money escrow, this is a compliance gap.

**Fix:** Add an `AuditLog` model and record admin actions, especially those that manipulate payment state.

### I6. Product Marked SOLD at Offer Acceptance, Not at Payment

**File:** `src/server/api/routers/offer.ts` (lines 261-265, 351-355)

When an offer is accepted, the product is immediately marked as SOLD. But if the buyer never pays (since payment flow is not triggered -- see C4), the product becomes unavailable to other buyers while the order sits in CREATED limbo.

**Fix:** Only mark a product as SOLD when the Order transitions to PAID (confirmed via webhook).

### I7. Return Flow Lacks EasyBox Return AWB Generation

**Spec reference:** Section 6.5, item 4: "buyer primeste instructiuni EasyBox retur"

When a seller accepts a return, the return status becomes ACCEPTED, but there is no mechanism for the buyer to generate a return AWB or get return shipping instructions. The spec specifically calls this out as part of the flow.

**Fix:** Add a `shipping.createReturnShipment` mutation that generates a return AWB (reversed sender/recipient) and/or provide a way for the seller to generate the return label.

### I8. No Rate Limiting on API Endpoints

**Spec reference:** Section 10: "rate limiting pe API"

No rate limiting is implemented on any tRPC procedure or auth endpoint. The spec explicitly calls for it. All endpoint are vulnerable to abuse.

**Fix:** Add rate limiting middleware to the tRPC router (e.g., via upstash-rate-limiter or a Redis-based sliding window).

### I9. No Input Validation on Account Registration

**File:** `src/app/(auth)/inregistrare/register-form.tsx`

The registration form sends data to NextAuth's `signIn` flow. There is no Zod validation on the client or server for password strength, email format (beyond what the browser provides), or rate limiting on registration attempts.

**Fix:** Add Zod validation in the registration flow and rate-limit auth endpoints.

### I10. Sameday Shipment Created Outside of Order Transaction

**File:** `src/server/sameday.ts` (lines 222-241)

After creating a shipment via the Sameday API, the code uses dynamic imports to update Prisma models (`prisma.shipment.create`, `prisma.order.update`). These updates run outside a Prisma `$transaction`. If the Sameday API call succeeds but the database write fails, the Sameday shipment is created with no corresponding record in the system.

**Fix:** Move the database writes into the `shipping.createShipment` mutation inside a `$transaction`, and ensure the Sameday API call is only made after all preconditions are verified.

### I11. No Webhook Verifier for Sameday

The spec mentions "Webhook Sameday: status livrat -> SSE notificare" (Section 6.3), but there is no Sameday webhook endpoint or webhook secret verification. Delivery status updates would need to be polled via `trackShipment`.

### I12. Missing Spec Pages

Several pages listed in the spec are not implemented:
- `/cautare/page.tsx` -- Global search page (spec section 5, folder tree)
- `/(cont)/wallet/page.tsx` -- Stripe Connect wallet/payout history
- `/(cont)/retururi/page.tsx` -- Returns history page
- `/vanzator/[id]` -- Public seller profile (linked from product detail page but returns 404)

---

## Architecture Assessment

### Overall Fit With Spec: 7/10

**Strengths:**
- The schema closely follows the spec with all key entities (User, Product, Offer, RFQ, Order, Payment, Shipment, Return, Review, Wishlist).
- The three buying mechanisms (direct, negotiation, RFQ) are all structurally implemented.
- Stripe Connect escrow is correctly set up with manual capture and application fees.
- Sameday EasyBox shipping integration is present with locker location queries, AWB creation, and tracking.
- SSE real-time notifications via Redis pub/sub are in place.
- Admin panel with dashboard stats and dispute resolution is implemented.
- The tRPC router separation mirrors the spec's module structure.

**Gaps:**
1. **Payment orchestration after offer/RFQ acceptance is incomplete.** Neither the negotiation flow nor the RFQ flow transitions the buyer into payment after an offer is accepted. The Order is created in CREATED limbo with no path to payment for the buyer.

2. **The checkout/payment flow has a fundamental flaw in multi-seller scenarios** (C3) and the payment confirmation flow is duplicated with contradictory validation (C2).

3. **The Stripe webhook is dangerously overreaching** (C1), automatically marking orders delivered on the wrong event type.

4. **Shipping data collected at checkout is thrown away** -- no address, method selection, or cost flows into the actual shipping process.

5. **Operational gaps:** No escrow auto-release, no audit logging for admin actions, no rate limiting, no Sameday webhook.

6. **Several spec-listed pages are missing**, though the core functionality is present.

**Key architectural decisions are sound:**
- tRPC with Zod validation provides end-to-end type safety.
- Prisma with PostgreSQL on a VPS keeps costs predictable.
- SSE over Redis is appropriate for unidirectional notifications.
- The dual role User model (buyer + seller) matches C2C marketplace requirements.
- Hierarchical categories via self-referencing parentId work well.

**Critical architectural issues to address before production:**
- Fix the webhook handler to respond to the correct events for each state transition.
- Eliminate the duplicate escrow-release mutations and standardize on one path.
- Add payment intent creation into the offer/RFQ acceptance workflows.
- Add a background job for the 72-hour auto-release.
- Add proper audit logging around financial operations.
- Implement rate limiting.
