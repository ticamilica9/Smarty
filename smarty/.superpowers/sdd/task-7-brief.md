# Task 7: Product CRUD — Create & View

## Objective

Implement core product functionality: MinIO image storage, product tRPC router with full CRUD + search, create product form page, and product detail page.

## Files to Create

### 1. `src/lib/minio.ts` — MinIO/S3 client
- S3Client using `@aws-sdk/client-s3` with `forcePathStyle: true`
- Reads config from env vars: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
- Falls back to defaults: `http://localhost:9000`, `minioadmin`, `minioadmin`, `smarty-uploads`
- Exports: `uploadFile(key, body, contentType)`, `deleteFile(key)`, `getPublicUrl(key)`

### 2. `src/app/api/upload/route.ts` — Image upload API route
- POST handler accepting multipart FormData with `file` field
- Auth guard via `auth()` from `@/server/auth`
- Uploads to MinIO with key pattern `products/{userId}/{uuid}.{ext}`
- Returns JSON `{ url, key }`

### 3. `src/server/api/routers/product.ts` — Product tRPC router
Procedures:
- **create** (protected): title, description, categoryId, condition, price, optional brand/shade/skinType/images
- **getById** (public): returns product with seller (including sellerProfile), category, _count
- **getMyProducts** (protected): returns all products for current user
- **update** (protected): owner-only update of any product field
- **delete** (protected): owner-only delete
- **search** (public): query text (title/description ILIKE), categoryId, condition, minPrice, maxPrice, sortBy (newest/price_asc/price_desc), pagination (limit/offset), returns `{ products, total }`
- **getLatest** (public): latest ACTIVE products with optional limit (default 12)

### 4. `src/server/api/root.ts` — Update to include productRouter

### 5. `src/components/product/product-form.tsx` — Product creation form
- Client component
- Image upload area with previews, delete button per image, upload button
- Title (Input), Description (Textarea), Category (Select from tRPC), Condition (Select: Nou/Ca nou/Bun/Satisfacator), Price (Input number)
- Optional: Brand, Nuanta, Tip tenie
- Submit via tRPC `product.create` mutation
- Toast on success/error, redirect to `/cont/produse`

### 6. `src/app/(account)/cont/produse/nou/page.tsx` — New product form page
- Server component, auth guard
- Renders ProductForm

### 7. `src/app/(public)/produse/[id]/page.tsx` — Product detail page
- Client component using `useParams()`, `useSession()`
- Uses `trpc.product.getById.useQuery({ id })`
- Loading state with Skeleton
- Not-found state
- Layout: image gallery (main image + thumbnails), product info, seller card, action buttons
- Shows: title, price (formatRON), condition badge, brand, shade, skinType, description, seller name+rating
- Actions: Make offer button (if logged in and not owner), Buy now button, Add to wishlist

## Key Patterns
- Next-auth v5: `import { auth } from '@/server/auth'` + `await auth()`
- tRPC v11: `appRouter.createCaller(ctx)` for server-side calls
- Prisma 7 with adapter-pg
- All text in Romanian
- Base UI Select from `@base-ui/react/select`
