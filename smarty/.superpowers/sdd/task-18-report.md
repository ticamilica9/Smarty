# Task 18: SEO & Sitemap

## Summary

Implemented a dynamic sitemap at `/sitemap.xml` and a robots.txt at `/robots.txt` using Next.js file conventions.

## Files Created

### `src/app/sitemap.ts` — Dynamic sitemap

Generates an XML sitemap covering all public, indexable pages:

| Section | URLs | Source | Priority | Change Frequency |
|---|---|---|---|---|
| Home | `/` | Static | 1.0 | daily |
| Categories | `/categorii` + dynamic `/categorii/[slug]` per category | tRPC `caller.category.getAll()` | 0.9 (list), 0.8 (detail) | weekly |
| Products | Dynamic `/produse/[id]` per product (up to 50 latest active) | tRPC `caller.product.getLatest({ limit: 50 })` | 0.7 | weekly |
| Blog | `/blog` + dynamic `/blog/[slug]` per MDX file | `getAllPosts()` from `@/lib/mdx` | 0.8 (list), 0.6 (detail) | weekly (list), monthly (detail) |
| Cereri (RFQs) | `/cereri` + dynamic `/cereri/[id]` (up to 100 open RFQs) | tRPC `caller.rfq.getAll({ limit: 100 })` | 0.7 (list), 0.6 (detail) | weekly |

Each data-fetching block is wrapped in try-catch so the sitemap gracefully degrades to static pages if the database is unreachable.

- Uses `updatedAt ?? createdAt` for product and RFQ `lastModified` timestamps
- Uses blog post frontmatter `date` field for blog `lastModified`
- Route: `ƒ /sitemap.xml` (dynamic — re-generated on each request due to `auth()` / `headers()` dynamic API)

### `src/app/robots.ts` — robots.txt

Allows all crawlers (`User-Agent: *`) to access `/` but disallows:
- `/cont/` — user account pages
- `/admin/` — admin panel
- `/api/` — API routes

Points to `/sitemap.xml` as the sitemap location.

- Route: `○ /robots.txt` (static — pre-rendered at build time)

## Build Status

- Build: **PASS** (Next.js 16.2.9, Turbopack)
- Routes: `/sitemap.xml` (dynamic), `/robots.txt` (static)
- Commit: `837c0f8` — `feat: add dynamic sitemap and robots.txt`
