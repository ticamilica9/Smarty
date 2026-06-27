# Task 9: RFQ System — Report

## Objective
Implement a complete Requests for Quotes (RFQ) system where buyers can post requests for products and sellers can submit offers.

## Deliverables

### 1. tRPC Router: `src/server/api/routers/rfq.ts`
Procedures:
- **create** (protected): Creates an RFQ with title, description, categoryId, maxBudget. Sets 7-day expiry.
- **getAll** (public): Lists open, unexpired RFQs with optional category/search filters and pagination.
- **getById** (public): Returns a single RFQ with all its offers (including seller and product info).
- **getMyRFQs** (protected): Returns all RFQs for the current user (as buyer) with all offers, filterable by status.
- **offer** (protected): Seller submits an offer. Validates: not own RFQ, RFQ is OPEN and not expired, amount <= maxBudget, no duplicate pending offer. Optionally links a product.
- **accept** (protected): Buyer accepts an offer. In a transaction: marks offer ACCEPTED, rejects all other pending offers, sets RFQ to AWARDED, creates Order record.

### 2. Router Registration: `src/server/api/root.ts`
Added `rfqRouter` as `rfq` key.

### 3. Pages
| Route | File | Description |
|-------|------|-------------|
| `/cereri` | `src/app/(public)/cereri/page.tsx` | Public list of open RFQs with search bar, category filter, loading/empty states |
| `/cereri/[id]` | `src/app/(public)/cereri/[id]/page.tsx` | RFQ detail with description, all offers, offer submission dialog, accept button for buyer |
| `/cereri/noua` | `src/app/(public)/cereri/noua/page.tsx` | "Posteaza o cerere" form with title, description, category select, max budget input |
| `/cont/cereri` | `src/app/(account)/cont/cereri/page.tsx` | "Cererile mele" — tabbed view (Active/Awarded/Closed) with per-RFQ status and accepted offer info |

## Business Rules Enforced
- Offer amount must not exceed RFQ maxBudget
- Seller cannot offer on their own RFQ
- Only one pending offer per seller per RFQ
- Accepting an offer closes the RFQ (status AWARDED) and creates an Order record
- All other pending offers are rejected when one is accepted
- RFQs expire after 7 days

## Build Status
- `next build` passes with zero errors
- Commit: `7a7f12d` — `feat: add RFQ system`
