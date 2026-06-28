# Task 14: Wishlist

## Summary

Implemented the full wishlist system for Smarty Marketplace, including tRPC procedures and user-facing pages.

## Files Modified

### Server - tRPC Router

- **`src/server/api/routers/product.ts`** -- Added 3 procedures to the existing `productRouter`:
  - `toggleWishlist` (protected mutation) -- If a `WishlistItem` for the user+product exists, it is deleted; otherwise it is created. Returns `{ added: boolean }` indicating whether the item was added (`true`) or removed (`false`). Uses the `userId_productId` compound unique key from Prisma for lookup.
  - `getWishlist` (protected query) -- Returns all `WishlistItem` records for the current user, each including the full product details via `productWithIncludes` (seller, category, `_count`).
  - `isWishlisted` (protected query) -- Takes a `productId` and returns `{ isWishlisted: boolean }` indicating whether the product is in the user's wishlist. Uses the compound unique key for lookup.

## Files Created

### Pages

- **`src/app/(cont)/wishlist/page.tsx`** -- Server component with auth guard. Redirects unauthenticated users to `/auth/login`. Renders the page shell with title ("Wishlist") and description, then delegates to the `WishlistClient` component.

- **`src/app/(cont)/wishlist/wishlist-client.tsx`** -- Client component that:
  - Fetches wishlist items via `trpc.product.getWishlist.useQuery()`
  - Handles **loading** state with skeleton cards (3 animated placeholders)
  - Handles **empty** state with a Heart icon, "Wishlist-ul tau este gol." message, and an "Exploreaza produse" button linking to `/categorii`
  - Handles **error** state through tRPC's built-in error handling (not explicitly rendered, standard tRPC retry/error behavior surfaces via the query)
  - Renders each item as a `WishlistCard` with product thumbnail, title (linked to `/produs/[id]`), price in RON, formatted added date, and a remove button (Trash2 icon)
  - On remove, calls `trpc.product.toggleWishlist.mutate()` and invalidates the `getWishlist` cache on success to keep the UI in sync

## Key Design Decisions

- **Compound unique key**: Uses Prisma's `@@unique([userId, productId])` constraint on the `WishlistItem` model for efficient lookup in `toggleWishlist` and `isWishlisted`, avoiding the need for a separate find by composite fields
- **Toggle pattern**: Single mutation handles both add and remove, returning `added: boolean` so callers know the resulting state without a separate query
- **Cache invalidation**: On successful toggle, the wishlist query cache is invalidated so the list re-renders automatically
- **Reuses existing patterns**: Follows the same component structure as the orders page (`comenzi/page.tsx` with server component + client component), uses the same `productWithIncludes` for product details, and applies the same `formatRON` utility

## Build Status

- Build: **PASS** (Next.js 16.2.9, Turbopack)
- Commit: `8a8d2af` - `feat: add wishlist functionality`
- New route: `/wishlist` (under `(cont)` route group, auth-guarded)
