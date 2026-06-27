# Task 6: Categories & Browse -- Report

## Summary

Built the category management system with seed data, tRPC router, and browse pages for the Smarty Marketplace.

## Files Created

### Seed Script

| File | Description |
|------|-------------|
| `prisma/seed.ts` | Seeds 59 categories in a 3-level tree: Machiaj (4 subcategories, 20 leaf nodes), Ingrijirea tenului (6), Ingrijirea corpului (5), Par (4), Parfumuri (3), Haine (2 subcategories, 13 leaf nodes), Accesorii (6). Uses PrismaPg adapter for Prisma 7 compatibility |

### Category tRPC Router

| File | Description |
|------|-------------|
| `src/server/api/routers/category.ts` | Three public procedures: `getAll` (optional parentId filter), `getBySlug` (with parent, children, product count), `getAncestors` (walks parent chain for breadcrumbs) |

### UI Components

| File | Description |
|------|-------------|
| `src/components/ui/breadcrumbs.tsx` | Server-compatible breadcrumbs with Home icon, chevron separators, aria-current for last item, truncation |
| `src/components/product/product-card.tsx` | Product card with image (or placeholder), condition badge, wishlist button, title, price in RON, seller link |
| `src/components/product/product-grid.tsx` | Responsive grid (2-4 cols) with empty state, configurable columns |
| `src/components/product/product-filters.tsx` | Client component filter sidebar -- condition checkboxes (Nou/Ca nou/Bun/Satisfacator) and price ranges (Sub 50/50-100/100-200/Peste 200). Uses URL search params for state |

### Pages

| File | Description |
|------|-------------|
| `src/app/(public)/categorii/page.tsx` | Category listing -- all root categories in a 3-column card grid with icons, subcategory badges, product counts |
| `src/app/(public)/categorii/[slug]/page.tsx` | Category browse -- breadcrumbs, page header with count, subcategory pill links, filter sidebar (desktop), product grid, mobile filter (details/summary). Uses `notFound()` for missing slugs |

### Files Modified

| File | Change |
|------|--------|
| `src/server/api/root.ts` | Added `categoryRouter` import and registration |
| `prisma.config.ts` | Added `seed: "npx tsx prisma/seed.ts"` to migrations config |
| `package.json` | Removed deprecated prisma seed config, added `seed` npm script |

## Verification

Build output confirms all routes compile:

```
Route (app)
├ ƒ /categorii
├ ƒ /categorii/[slug]
```

Live server tests (all status codes verified):
- `GET /categorii` -- 200 (category listing)
- `GET /categorii/machiaj` -- 200 (top-level category with subcategories)
- `GET /categorii/ruj` -- 200 (third-level category, breadcrumbs: Machiaj > Buze > Ruj)
- `GET /categorii/nonexistent` -- 404 (notFound() triggers correctly)

HTML content verification:
- `/categorii/machiaj` contains "Machiaj" and "Subcategorii"
- `/categorii/ruj` contains "Ruj" and "Buze" (breadcrumbs)

Seed script executed successfully: 59 categories populated across 3 levels.

## Key Decisions

1. **Direct Prisma queries in page.tsx**: The category browse page queries Prisma directly rather than calling tRPC. This keeps server components simple and avoids the tRPC-over-HTTP round trip for server-rendered content.

2. **URL-based filters**: Product filters use URL search params (`?stare=NEW&pretMin=0&pretMax=50`) rather than client state. This enables shareable URLs and works with server-side rendering.

3. **Breadcrumbs from parent chain**: The browse page walks `parentId` references up to the root to build breadcrumbs, supporting arbitrary depth without recursion.

4. **Prisma 7 seed configuration**: Uses `prisma.config.ts` (not package.json) with the `adapter-pg` pattern since the standard `PrismaClient()` constructor without adapter fails in Prisma 7.

---

## Commit

`cc07bbc` -- `feat: implement categories, browse, and seed script`
