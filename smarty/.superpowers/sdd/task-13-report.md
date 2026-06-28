# Task 13: Orders, Returns & Reviews

## Summary

Implemented the full orders, returns, and reviews system for Smarty Marketplace, including tRPC routers and user-facing pages.

## Files Created

### Server - tRPC Routers

- **`src/server/api/routers/order.ts`** -- Order router with 4 procedures:
  - `getMyOrders` (protected) -- returns all orders where current user is buyer, optional status filter
  - `getMySales` (protected) -- returns all orders where current user is seller, optional status filter
  - `getById` (protected) -- returns order by ID with product/seller/buyer/payment/shipment/review/return includes. Accessible by both buyer and seller
  - `confirmDelivery` (protected) -- buyer-only, order must be SHIPPED. Captures Stripe PaymentIntent to release escrow, then atomically updates Order to DELIVERED and Payment to RELEASED in a Prisma transaction

- **`src/server/api/routers/return.ts`** -- Return router with 4 procedures:
  - `request` (protected) -- buyer-only, max 14 days from delivery, order must be DELIVERED, validates no duplicate return
  - `respond` (protected) -- seller-only, accepts or refuses. Accepting triggers Stripe refund + atomic update of Return/Payment/Order in a transaction
  - `getMyReturns` (protected) -- returns all returns for current user (as buyer)
  - `escalateToDispute` (protected) -- buyer-only after seller refuses, sets Order status to DISPUTED

- **`src/server/api/routers/review.ts`** -- Review router with 2 procedures:
  - `create` (protected) -- buyer-only, order must be DELIVERED, one review per order. Creates review in a transaction with seller rating recalculation (average of all seller reviews)
  - `getByProduct` (public) -- returns all reviews for a product with reviewer info

### Server - Modified

- **`src/server/api/root.ts`** -- added `orderRouter`, `returnRouter`, `reviewRouter`

### Pages

- **`src/app/(cont)/comenzi/page.tsx`** -- Orders list page with two tabs:
  - "Cumparaturi" tab: orders where user is buyer (via `order.getMyOrders`)
  - "Vanzari" tab: orders where user is seller (via `order.getMySales`)
  - Each order card shows product thumbnail, title, amount, status badge, date, counterparty. Links to order detail page

- **`src/app/(cont)/comenzi/[id]/page.tsx`** -- Server component wrapper with auth check, renders `OrderDetail` client component

- **`src/app/(cont)/comenzi/[id]/order-detail.tsx`** -- Order detail client component with:
  - Order header with status badge and creation date
  - Product card with link
  - Supplier/buyer info card
  - Payment info card (escrow/released/refunded)
  - Shipping info card (AWB, pickup code, tracking link, estimated delivery)
  - Return info card with status and seller respond buttons
  - **Buyer actions**: confirm delivery (when SHIPPED), request return (when DELIVERED within 14 days), escalate to dispute (after return refusal)
  - **Seller actions**: accept/refuse pending return requests
  - Review display when exists
  - Review create dialog with star rating and text

## Key Design Decisions

- **Atomic transactions**: `confirmDelivery` uses `stripe.paymentIntents.capture()` for escrow release then a Prisma `$transaction` to atomically update Order + Payment. Same pattern for return acceptance (Stripe refund + Return/Payment/Order update)
- **Access control**: `getById` allows both buyer and seller to view the order. All mutation procedures check ownership before proceeding
- **Seller rating**: Calculated as average of all review ratings where the seller is the target, updated on each new review via `review.aggregate`
- **14-day return window**: Calculated from `order.updatedAt` (set by Prisma when `status` changes to DELIVERED)
- **Route structure**: Pages are under `(cont)/comenzi` route group resulting in `/comenzi` and `/comenzi/[id]` URLs

## Build Status

- Build: **PASS** (Next.js 16.2.9, TypeScript check passed)
- Commit: `82edf02` - `feat: add orders, returns, and reviews`
