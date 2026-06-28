# Task 17: Home Page

## Summary

Implemented a fully dynamic home page at `/` with 5 major sections, all rendered as a server component using tRPC `createCaller` for data fetching.

## Sections Built

### 1. Hero Section
- Purple-to-pink gradient background (`from-purple-600 via-purple-500 to-pink-500`)
- Grid overlay pattern for visual texture
- Headline: "Gasesti ce iti doresti, la pretul potrivit"
- Subtitle describing the platform
- Two CTA buttons: "Exploreaza produse" (white/filled, links to `/categorii`) and "Posteaza o cerere" (outlined, links to `/cereri/noua`)

### 2. Categories Grid
- Fetches root categories via `caller.category.getAll({ parentId: null })`
- Displays up to 5 categories in a responsive grid (2 cols mobile, 3 sm, 5 lg)
- Each card shows: emoji icon (`category.icon` from DB seed), category name, product count
- Hover effect: border highlight and icon scale
- Desktop "Toate categoriile" link; mobile version shown below the grid

### 3. Active RFQs Section
- Fetches latest open RFQs via `caller.rfq.getAll({ limit: 4 })`
- Conditionally rendered when RFQs exist (`activeRfqs.rfqs.length > 0`)
- 2-column grid of cards, each showing: title, offer count badge, description (2-line clamp), budget (formatted via `formatRON`), and category name
- Links to individual RFQ detail pages at `/cereri/[id]`

### 4. Latest Products Grid
- Fetches latest 8 active products via `caller.product.getLatest({ limit: 8 })`
- Conditionally rendered when products exist
- 4-column responsive grid using the existing `ProductCard` component (with seller name hidden)
- "Vezi toate produsele" CTA at the bottom linking to `/categorii`

### 5. "Cum functioneaza" Section
- 3-step guide in a 3-column grid:
  - **Posteaza**: Package icon, purple accent — "Adauga produsul tau sau creeaza o cerere"
  - **Negociaza**: Handshake icon, pink accent — "Comunica direct cu cumparatori sau vanzatori si negociaza pretul"
  - **Primeste**: Truck icon, green accent — "Plateste in siguranta si primesti produsul acasa sau in EasyBox"

## Technical Details

- **File modified**: `src/app/(public)/page.tsx`
- Server component with `async` data fetching
- Uses `api()` helper from `@/lib/trpc/server` to create tRPC caller
- Three procedures called in parallel via `Promise.all`:
  - `category.getAll({ parentId: null })` — root categories
  - `product.getLatest({ limit: 8 })` — latest 8 active products
  - `rfq.getAll({ limit: 4 })` — latest 4 open RFQs
- Reuses existing components: `Button`, `Card`, `CardContent`, `CardTitle`, `Badge`, `ProductCard`
- Uses `formatRON()` for budget/price display
- Uses `lucide-react` icons: `Package`, `Handshake`, `Truck`, `ArrowRight`

## Build Status

- Build: **PASS** (Next.js 16.2.9, Turbopack)
- Route: `/` (dynamic — server-rendered on demand)
- Commit: `e97722f` — `feat: add home page with hero, categories, RFQs, and products`
