# Task 7: Product CRUD -- Create & View -- Report

## Summary

Implemented core product functionality: MinIO image storage, product tRPC router with full CRUD + search, create product form page, and product detail page.

## Files Created

| File | Description |
|------|-------------|
| `src/lib/minio.ts` | MinIO/S3 client using `@aws-sdk/client-s3` with `forcePathStyle: true`. Exports `uploadFile`, `deleteFile`, `getPublicUrl`. Reads config from env vars with localhost defaults |
| `src/app/api/upload/route.ts` | POST API route for image uploads. Auth-guarded, uploads to MinIO with key pattern `products/{userId}/{uuid}.{ext}` |
| `src/server/api/routers/product.ts` | Product tRPC router with 7 procedures: `create`, `getById`, `getMyProducts`, `update`, `delete`, `search`, `getLatest` |
| `src/components/product/product-form.tsx` | Client component for creating products. Features: image upload with previews, category/condition selects (Base UI), title/description/price inputs, optional brand/shade/skinType fields, tRPC mutation submit with toast feedback |
| `src/app/(account)/cont/produse/nou/page.tsx` | New product form page -- server component with auth guard, renders ProductForm |
| `src/app/(public)/produse/[id]/page.tsx` | Product detail page -- client component. Full layout: image gallery (main + thumbnails), product info, seller card, action buttons (buy/offer/wishlist). Loading skeleton state, notFound for missing products |

## Files Modified

| File | Change |
|------|--------|
| `src/server/api/root.ts` | Added `productRouter` import and registration as `product:` |
| `src/components/layout/account-sidebar.tsx` | Updated "Adauga anunt" link from `/cont/anunt-nou` to `/cont/produse/nou` |
| `.superpowers/sdd/progress.md` | Marked Task 7 as complete |

## tRPC Router Procedures

| Procedure | Auth | Input | Description |
|-----------|------|-------|-------------|
| `create` | protected | title, description, categoryId, condition, price, brand?, shade?, skinType?, images[] | Create a new product |
| `getById` | public | id | Full product with seller (+profile), category, _count |
| `getMyProducts` | protected | (none) | All products for current user, newest first |
| `update` | protected | id + optional fields | Owner-only partial update |
| `delete` | protected | id | Owner-only delete |
| `search` | public | query?, categoryId?, condition?, minPrice?, maxPrice?, sortBy?, limit, offset | Full-text search with filters, returns `{ products, total }` |
| `getLatest` | public | limit? (default 12) | Latest ACTIVE products |

## Key Patterns Used

1. **Next-auth v5**: `import { auth } from '@/server/auth'` + `await auth()` in server components and API routes
2. **tRPC v11**: `appRouter.createCaller(ctx)` pattern for server-side calls (via `@/lib/trpc/server`)
3. **Prisma 7**: Standard queries with adapter-pg, `mode: 'insensitive'` for case-insensitive search
4. **Base UI Select**: `onValueChange` handler receives `(value: string | null, event)` - wrapped with null guard `(v) => v && setState(v)`
5. **Client-side session**: Product detail page uses `useSession()` from `next-auth/react` (SessionProvider in root layout)

## Verification

Build output confirms all routes compile:

```
Route (app)
├ ƒ /api/upload
├ ƒ /cont/produse/nou
└ ƒ /produse/[id]
```

TypeScript check: `npx tsc --noEmit` -- passed (no errors)
Build: `npm run build` -- passed (all routes compile, no TypeScript errors)

## Fix: Navigation link corrections (2026-06-28)

Two broken navigation links in the header were corrected to point to the actual product creation route at `/cont/produse/nou`:

| Location | Before | After |
|----------|--------|-------|
| User dropdown "Adauga anunt" | `/cont/anunt-nou` | `/cont/produse/nou` |
| Mobile sidebar "+ Vinde" | `/produse/nou` | `/cont/produse/nou` |
| Desktop nav "+ Vinde" | `/produse/nou` | `/cont/produse/nou` |

**File changed**: `src/components/layout/header-client.tsx`
