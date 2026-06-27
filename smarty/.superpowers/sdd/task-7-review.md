# Task 7 Review: Product CRUD

## Verdicts

| Dimension | Result |
|-----------|--------|
| Spec Compliance | **PASS** (2 bugs in adjacent files, see below) |
| Implementation Quality | **PASS** |

---

## Spec Compliance

### 1. `src/lib/minio.ts` — PASS
- `@aws-sdk/client-s3` with `forcePathStyle: true`
- Env var config (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`) with localhost defaults
- Exports `uploadFile(key, body, contentType)`, `deleteFile(key)`, `getPublicUrl(key)` — all three present

### 2. `src/app/api/upload/route.ts` — PASS
- POST handler accepting FormData with `file` field
- Auth guard via `auth()` from `@/server/auth`
- Key pattern `products/{userId}/{uuid}.{ext}`
- Returns `{ url, key }`

### 3. `src/server/api/routers/product.ts` — PASS

All 7 procedures present:

| Procedure | Auth | Verdict |
|-----------|------|---------|
| `create` | protected | Correct: title/description/categoryId/condition/price required; brand/shade/skinType/images optional |
| `getById` | public | Correct: includes seller (+sellerProfile), category, `_count` (wishlistItems, offers) |
| `getMyProducts` | protected | Correct: filtered by `sellerId`, ordered by `createdAt desc` |
| `update` | protected | Correct: owner-only check via `sellerId !== userId`; partial update with optional fields + `status` |
| `delete` | protected | Correct: owner-only check before delete |
| `search` | public | Correct: text search (title/description ILIKE), categoryId/condition/price filters, sortBy (newest/price_asc/price_desc), pagination (limit/offset), returns `{ products, total }` |
| `getLatest` | public | Correct: ACTIVE products only, default limit 12 |

### 4. `src/server/api/root.ts` — PASS
- `productRouter` imported and registered as `product:`

### 5. `src/components/product/product-form.tsx` — PASS
- Client component (`'use client'`)
- Image upload with previews, delete button per image, upload button
- Title (Input), Description (Textarea), Category (Select with data from `trpc.category.getAll`), Condition (Select: Nou/Ca nou/Bun/Satisfacator), Price (Input number)
- Optional fields: Brand, Nuanta, Tip tenie
- tRPC `product.create` mutation with toast on success/error, redirect to `/cont/produse`
- Select components are wrappers around `@base-ui/react/select` (spec pattern)

### 6. `src/app/(account)/cont/produse/nou/page.tsx` — PASS
- Server component with auth guard via `auth()`
- Renders `ProductForm`

### 7. `src/app/(public)/produse/[id]/page.tsx` — PASS
- Client component using `useParams()`, `useSession()`
- Uses `trpc.product.getById.useQuery({ id })`
- Loading state with `Skeleton` components
- `notFound()` when product is null
- Image gallery (main image + thumbnails)
- Shows: title, price via `formatRON()`, condition badge via `conditionLabel()`, brand/shade/skinType/description, seller name+rating
- Action buttons: Buy now, Make offer, Add to wishlist
- States: unauthenticated (login prompt), owner (info message), non-owner logged in (buy/offer buttons)

---

## Issues Found

### BUG-1: Broken "Adauga anunt" link in user dropdown menu

**File**: `src/components/layout/header-client.tsx`, line 290

The dropdown menu item links to `/cont/anunt-nou`, which is an old path that no longer exists. The correct path is `/cont/produse/nou`. This causes a 404 when the user clicks the link.

**Fix**: Change `href="/cont/anunt-nou"` to `href="/cont/produse/nou"`.

### BUG-2: Broken "+ Vinde" button links

**Files**: `src/components/layout/header-client.tsx`, lines 108 and 189

Both the mobile sidebar "+ Vinde" link (line 108) and the desktop nav "+ Vinde" button (line 189) point to `/produse/nou`. This route does not exist — the new product page is at `/cont/produse/nou` (under the `(account)` route group). Clicking these will result in a 404.

Note: These two links were likely added during Task 5 (header) when the routing pattern was different, and were not updated to reflect the final route location.

**Fix**: Change both `href="/produse/nou"` to `href="/cont/produse/nou"`.

### MINOR-1: Redundant nullish coalescing in getLatest

**File**: `src/server/api/routers/product.ts`

The `getLatest` input schema is:
```ts
z.object({ limit: z.number().min(1).max(50).default(12) }).optional()
```

The `.optional()` wrapping means when the procedure is called with no argument, `input` is `undefined` and the Zod default is bypassed. The query body compensates with `input?.limit ?? 12`. This works but is inconsistent — the Zod `.default(12)` is unused in the no-argument case. Consider:
```ts
z.object({ limit: z.number().min(1).max(50).default(12) })
```
and then `client.getLatest()` would pass `{}` as input, letting Zod apply the default.

### MINOR-2: No server-side file validation in upload endpoint

**File**: `src/app/api/upload/route.ts`

The upload handler does not validate file size, MIME type, or image count. A malicious or careless user could upload excessively large files. The form limits to "10 images" client-side only.

---

## Quality Assessment

| Area | Rating | Notes |
|------|--------|-------|
| Code organization | Good | Files follow project conventions, proper separation of concerns |
| Error handling | Good | tRPC error formatting via ZodError, 401 for unauthenticated, 403 for non-owners, toast feedback |
| Romanian text | Good | All user-facing labels, error messages, and placeholders in Romanian |
| Router auth guards | Good | Write operations (create/update/delete) are protected; reads are public |
| Edge cases | Good | Loading skeleton, notFound, unauthenticated prompts, owner view |
| Build & type-check | Good | Report confirms `npx tsc --noEmit` and `npm run build` both pass |

The two broken navigation links (BUG-1, BUG-2) are in `header-client.tsx` which is shared infrastructure, not in the product-specific files. The product CRUD implementation itself is complete and correct.
