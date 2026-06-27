# Task 8: Offer System (Negotiation) -- Report

## Summary

Implemented Vinted-style price negotiation system: buyers can make offers below list price, sellers can accept/refuse/counter (max 3 rounds), countered offers let buyers accept or refuse. Offer expiry is 48 hours. Accepting an offer creates an Order record and marks the product as SOLD.

## Files Created

| File | Description |
|------|-------------|
| `src/server/api/routers/offer.ts` | Offer tRPC router with 6 procedures: `create`, `respond`, `acceptCounter`, `getMyOffers`, `getReceivedOffers`, `getByProduct` |
| `src/components/offer/offers-tabs.tsx` | Client component with tabs for My Offers / Received Offers, action buttons (accept/refuse/counter), counter-offer dialog, loading skeletons, empty states |
| `src/app/(account)/cont/oferte/page.tsx` | Offers list page at `/cont/oferte` -- server component with auth guard, renders OffersTabs |

## Files Modified

| File | Change |
|------|--------|
| `src/server/api/root.ts` | Added `offerRouter` import and registration as `offer:` |

## tRPC Router Procedures

| Procedure | Auth | Input | Description |
|-----------|------|-------|-------------|
| `create` | protected | productId, amount (< list price) | Create offer on product (48h expiry, round=1). Rejects own-product, duplicate active offers, offers >= list price |
| `respond` | protected | id, action (ACCEPTED/REFUSED/COUNTERED), counterAmount? | Seller responds. Counter increments round (max 3), creates new offer. Accept creates Order, marks product SOLD |
| `acceptCounter` | protected | id, action (ACCEPTED/REFUSED) | Buyer responds to a counter-offer. Accept creates Order, marks product SOLD |
| `getMyOffers` | protected | status? (optional filter) | All offers by current user (buyer perspective) |
| `getReceivedOffers` | protected | status? (optional filter) | All offers to current user (seller perspective) |
| `getByProduct` | public | productId | All offers for a product |

## Business Rules Enforced

1. Cannot offer on own product (FORBIDDEN)
2. Offer must be less than list price (BAD_REQUEST)
3. Max 3 counter-offer rounds (starts at 1, increments on counter, blocked at 3)
4. Counter must be higher than original offer, lower than list price
5. Offers expire after 48 hours (checked on respond/acceptCounter)
6. Duplicate active offers on same product rejected (CONFLICT)
7. Accepting any offer (original or counter) creates an Order record with status CREATED and marks product as SOLD
8. Responses validated by ownership (seller for respond, buyer for acceptCounter)

## Component States Covered

- **Loading**: Skeleton cards (3 placeholders) shown while queries load
- **Empty**: Icon + message for no offers and no received offers
- **Error**: Toast error notifications on mutation failures
- **Expired**: Expired offers show "Expirata" badge and hide action buttons
- **Active states**: Loading spinners on action buttons during mutations
- **Dialog**: Counter-offer modal with amount input, validation hints, cancel/submit

## Verification

Build output confirms `/cont/oferte` route:

```
Route (app)
├ ƒ /cont
├ ƒ /cont/oferte
├ ƒ /cont/produse/nou
...
```

Build: `npm run build` -- passed (TypeScript check + compilation success, no errors)
Commit: `6eac0bc` -- `feat: add offer negotiation system`

---

## Bugfix: Prevent seller from acting on countered offers (2026-06-28)

**Bug:** In the "Received Offers" tab, action buttons (accept/refuse/counter) were shown for COUNTERED offers where the seller was the one who made the counter-offer. This theoretically allowed a seller to accept their own counter.

**Fix:** Added `offer.status === 'PENDING'` guard to the outer action buttons condition in `OfferCard` (line 261), reinforcing that action buttons only render for PENDING offers. The inner conditions (`showAcceptRefuse`, `showAcceptCounter`, `showCounter`) already checked for `PENDING`, but the outer guard now makes the intent explicit and prevents any edge case where a non-PENDING offer could render action buttons.

**File modified:** `src/components/offer/offers-tabs.tsx`

**Verification:** `npx tsc --noEmit` -- passed, no errors.

**Commit:** `1cb4743` -- `fix: prevent seller from acting on countered offers`
