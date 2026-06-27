# Task 9 Review: RFQ System

Review of commit `7a7f12d` (feat: add RFQ system) against the brief embedded in `task-9-report.md`.

---

## Verdict 1: Spec Compliance — PASS

### tRPC Router (6 procedures) — PASS

| Procedure | Status | Notes |
|-----------|--------|-------|
| `create` (protected) | PASS | Zod-validated input (title, description, categoryId, maxBudget). 7-day expiry via `Date.now() + 7*24*60*60*1000`. Status set to OPEN. |
| `getAll` (public) | PASS | Filters by OPEN + unexpired. Optional `categoryId`, `search` (ILIKE on title/description), pagination (`limit`/`offset`). Returns `{ rfqs, total }`. |
| `getById` (public) | PASS | Returns single RFQ with all offers (seller + product info). Throws NOT_FOUND. |
| `getMyRFQs` (protected) | PASS | Filters by `buyerId` (current user). Optional `status` filter. Includes offers with seller/product. |
| `offer` (protected) | PASS | All 5 validations implemented: not own RFQ, status OPEN, not expired, amount <= maxBudget, no duplicate pending offer. Optionally links product (validates ownership). |
| `accept` (protected) | PASS | Buyer-only guard, RFQ must be OPEN, offer must be PENDING. Uses Prisma `$transaction`: marks offer ACCEPTED, rejects other PENDING offers, sets RFQ to AWARDED, creates Order record. |

### Router Registration — PASS

`src/server/api/root.ts` imports `rfqRouter` and registers it as key `rfq`.

### Pages (4 routes) — PASS

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/cereri` | `src/app/(public)/cereri/page.tsx` | PASS | Public list, search bar, category filter, loading skeleton, empty state with CTA. |
| `/cereri/[id]` | `src/app/(public)/cereri/[id]/page.tsx` | PASS | Detail with offers list, offer submission dialog, accept button (buyer only), loading/not-found/expired states. |
| `/cereri/noua` | `src/app/(public)/cereri/noua/page.tsx` | PASS | Create form with title, description, category select, max budget input. Client-side validation + auth guard. |
| `/cont/cereri` | `src/app/(account)/cont/cereri/page.tsx` | PASS | Tabbed view (Active/Awarded/Closed), per-RFQ status badge, accepted offer info, skeleton/empty states. |

### Business Rules — PASS

| Rule | Enforced | Location |
|------|----------|----------|
| Offer <= maxBudget | Yes | Server-side (offer procedure) + client-side (detail page) |
| No self-offering | Yes | Server-side (offer procedure) |
| One pending offer per seller per RFQ | Yes | Server-side (offer procedure checks existing PENDING) |
| Accept closes RFQ (AWARDED) + creates Order | Yes | Server-side (accept procedure, in transaction) |
| All other pending offers rejected on accept | Yes | Server-side (accept procedure, `updateMany` in transaction) |
| 7-day expiry | Yes | Server-side (create sets `expiresAt`, getAll/getById/offer filter) |

---

## Verdict 2: Task Quality — PASS (Minor issues noted)

### Strengths
- All business rules are enforced server-side with proper TRPCError codes (FORBIDDEN, BAD_REQUEST, CONFLICT, NOT_FOUND). Client-side validation provides fast feedback but is never the sole enforcement.
- The `accept` procedure uses `$transaction` for atomicity across four writes (accept offer, reject others, update RFQ, create Order) — correct handling of a critical race-condition-prone operation.
- All pages cover loading states (Skeleton), empty states (icons + messaging), and error states (toast, notFound, conditional rendering).
- Romanian text is consistent across all UI and error messages.
- Consistent use of the `getTimeRemaining` utility function across all pages.
- Build passes (`npx tsc --noEmit` clean, confirmed).

### Issues

**1. `(rfq as any).offers ?? []` type escape (detail page, line 416)**
The result of `getById` uses `rfqDetailIncludes` which includes `offers`, yet the code casts to `any` and provides a fallback `?? []`. This suggests a type mismatch between the Prisma include result and the expected type, or the developer was uncertain the field would always be present. While functional, this bypasses TypeScript safety. Root cause: the `rfqDetailIncludes` object uses a Prisma 7 `include`-with-field-selects syntax that may generate a type where `offers` is typed differently from what `(rfq as any).offers` expects.

**2. `getMyRFQs` status filter unused by the page (account page)**
The `getMyRFQs` procedure accepts an optional `status` filter, but the page at `/cont/cereri` calls `trpc.rfq.getMyRFQs.useQuery()` with no input and performs client-side filtering into open/awarded/closed arrays. For small datasets this is negligible, but as data grows it fetches all of a user's RFQs every time. The server-side filter should be used per tab.

**3. No `categoryId` existence check in `create`**
The `create` procedure accepts `categoryId` without verifying the referenced category exists. Passing a non-existent ID will trigger a Prisma foreign-key constraint error with a generic message rather than a clean application error. A `findUnique` check before create would provide a better user experience.

**4. No `rfq.getAll` invalidation after offer submission (detail page)**
When an offer is submitted from the detail page, only `rfq.getById` and `rfq.getMyRFQs` are invalidated. The public list page (`rfq.getAll`) is not invalidated, so the offer count shown on the list page may be stale until a manual refresh.

**5. Minor: `CLOSED` status unreachable via any procedure**
The `CLOSED` status exists in the enum but is never set by any procedure. `getAll` filters by OPEN; `accept` sets to AWARDED; there is no close/cancel API. This may be intentional (CLOSED reserved for post-expiry automation), but the gap is worth documenting.

**6. Minor: `getTimeRemaining` function duplicated across three pages**
Defined identically in `cereri/page.tsx`, `cereri/[id]/page.tsx`, and `cont/cereri/page.tsx`. Could be extracted to `@/lib/utils` to reduce duplication.

### Build Verification

- `npx tsc --noEmit`: passes with zero errors.
- Files verified on disk: rfq.ts router, all 4 page files, root.ts registration.

---

## Summary

| Dimension | Verdict |
|-----------|---------|
| Spec Compliance | PASS — All 6 procedures, 4 pages, and 6 business rules are implemented as specified. |
| Task Quality | PASS — well-structured code with proper error handling, transactional integrity, and good UX states. Minor issues noted (one type escape, some missing cache invalidations, duplicated utility, no category existence check). |

None of the issues are blockers; the RFQ system is functionally complete and correct.
