# Task 8: Offer System (Negotiation) -- Review

## Verdict 1: Spec Compliance -- PASS (with remarks)

The brief (`task-8-brief.md`) does not exist in the repository. The spec was reconstructed from the task list items (58-62 in progress.md), the task-7-brief.md pattern, and the report's own claims. Against those, the implementation delivers:

### Procedures (6/6 -- PASS)

| Procedure | Auth | Present | Notes |
|---|---|---|---|
| `create` | protected | Yes | Rejects own-product (FORBIDDEN), amount >= price (BAD_REQUEST), duplicate active offers (CONFLICT), 48h expiry |
| `respond` | protected | Yes | Seller accepts/refuses/counters. Counter creates new offer (round+1, max 3), accept uses $transaction for Order+product SOLD |
| `acceptCounter` | protected | Yes | Buyer accepts/refuses counter-offer, same transactional pattern as accept in respond |
| `getMyOffers` | protected | Yes | Filters by buyerId, optional status filter |
| `getReceivedOffers` | protected | Yes | Filters by sellerId, optional status filter |
| `getByProduct` | public | Yes | No auth, returns all offers for a product |

### Business Rules (8/8 -- PASS)

1. Cannot offer on own product -- FORBIDDEN
2. Offer must be less than list price -- BAD_REQUEST
3. Max 3 counter-offer rounds -- BAD_REQUEST at round >= 3
4. Counter between original offer and list price -- BAD_REQUEST both bounds
5. 48h expiry checked on respond/acceptCounter -- BAD_REQUEST if expired
6. Duplicate active offers rejected -- CONFLICT
7. Accept creates Order (CREATED) + marks product SOLD -- implemented via $transaction
8. Ownership validation on responses -- FORBIDDEN for wrong party

### Component States (6/6 -- PASS)

Loading skeletons, empty states, error toasts, expired badges, spinner on action buttons, counter-offer dialog with validation hints -- all present.

### Spec Compliance Verdict: PASS

All documented business rules are enforced. All 6 procedures implemented. All component states covered.

---

## Verdict 2: Task Quality -- ACCEPTABLE (3 issues found)

### Issue 1 (Moderate): Seller can see action buttons on own counter-offers

When the seller counters an offer, a new PENDING offer is created (`round+1`) where the seller is still `sellerId`. This new offer appears in the "Received Offers" tab. The UI logic `showAcceptRefuse` checks `perspective === 'seller' && offer.status === 'PENDING' && !expired`, which matches this counter-offer. This means the seller sees Accept/Refuse/Counter buttons for their own counter-offer and could theoretically accept it, creating an Order without buyer consent.

**File**: `src/components/offer/offers-tabs.tsx`, lines 275-277 (`showAcceptRefuse`, `showCounter`)

**Fix**: Exclude offers where `round > 1` from seller action buttons, or add a flag to distinguish "counter-offers I made" from "offers I received."

### Issue 2 (Minor): Query error state renders as empty state

`OfferList` checks `isLoading` then `!offers || offers.length === 0`. If a tRPC query fails (network error, server error), `isLoading` is `false` and `data` is `undefined`, so the component shows the empty-state message ("Nu ai facut nicio oferta inca") -- masking the error. No `isError` handling exists.

**File**: `src/components/offer/offers-tabs.tsx`, lines 396-413

**Fix**: Add `isError` check before the empty-state branch, showing an error message.

### Issue 3 (Minor): No product status validation on offer creation

The `create` procedure does not check `product.status`. Offers can be created on SOLD or HIDDEN products. While the accept flow checks expiry, it does not re-verify product status, creating a race window: two concurrent accepts could both succeed (the `$transaction` only serializes writes within a single offer's accept, not across offers on the same product).

**File**: `src/server/api/routers/offer.ts`, lines 54-96

**Fix**: Reject offers on products with status `SOLD` (or `HIDDEN`) with BAD_REQUEST. Add a product-status check inside the accept transaction.

### Issue 4 (Cosmetic): No pagination on list queries

`getMyOffers`, `getReceivedOffers`, and `getByProduct` return all matching rows without `take`/`skip`. At scale this will degrade. The API accepts an optional `status` filter but no pagination params.

### Coding Standards (PASS)

- Follows existing project patterns (tRPC `router`/`protectedProcedure`, Prisma access via `ctx.prisma`, Zod validation, Romanian error messages)
- `root.ts` registration is clean
- `$transaction` used for atomic accept flow
- UI component separation (page -> tabs -> list -> card) is well-structured
- Counter-offer dialog with validation hints provides good UX

### Build Verification (PASS)

- `npm run build` passes (TypeScript + compilation, as confirmed in the report)
- Route `/cont/oferte` appears in build output

---

## Summary

| Dimension | Verdict |
|---|---|
| Spec Compliance | PASS -- all 6 procedures and 8 business rules implemented |
| Task Quality | ACCEPTABLE -- clean architecture, 1 moderate issue (seller acts on own counter-offer), 2 minor issues (error masking, missing product-status guard), 1 cosmetic (pagination) |
| Build | PASS |

**Recommendation**: Fix issues 1 (moderate) and 2 (minor) before proceeding to Task 9.
