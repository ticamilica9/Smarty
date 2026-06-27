# Task 5: Layouts & Navigation Shell -- Report

## Summary

Created the visual shell for the Smarty Marketplace application: three route-group layouts with a sticky header, footer, account sidebar, and admin sidebar.

## Files Created

### Layout Components (`src/components/layout/`)

| File | Description |
|------|-------------|
| `header.tsx` | **Server component** -- calls `auth()` from `@/server/auth`, passes user to HeaderClient |
| `header-client.tsx` | **Client component** -- sticky header with logo, desktop nav links, search bar, mobile Sheet menu (shadcn), user dropdown menu (shadcn). Shows auth buttons (Intra in cont / Creeaza cont) when logged out, and user menu with account links when logged in |
| `footer.tsx` | **Server component** -- 4-column footer with brand description, Ajutor links, Legal links, and copyright. All text in Romanian |
| `account-sidebar.tsx` | **Client component** -- sidebar nav for `/cont/*` pages: General (Panou de control, Profil, Setari), Cumparaturi (Comenzi, Dorinte, Mesaje), Vanzari (Produse, Adauga anunt, Vanzari). Includes logout link |
| `admin-sidebar.tsx` | **Client component** -- sidebar nav for `/admin/*` pages: Administrare (Dashboard, Utilizatori, Categorii, Produse, Comenzi, Mesaje, Blog, Rapoarte), Sistem (Setari). Includes "Inapoi la site" link |

### Route Group Layouts (`src/app/`)

| File | Description |
|------|-------------|
| `(public)/layout.tsx` | Wraps public pages with Header + Footer. Wraps the home page (/) |
| `(public)/page.tsx` | Home page moved from root -- hero section with Romanian text |
| `(account)/layout.tsx` | **Auth-protected** -- calls `auth()`, redirects to `/login` if unauthenticated. Wraps with Header + AccountSidebar |
| `(account)/cont/page.tsx` | Account dashboard page -- shows welcome message and quick-link cards |
| `(admin)/admin/layout.tsx` | **Admin-protected** -- calls `auth()`, checks `role === "ADMIN"`, redirects to `/login` if unauthorized. Wraps with AdminSidebar |
| `(admin)/admin/page.tsx` | Admin dashboard page -- placeholders for Users, Orders, Categories sections |

### Files Modified

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Changed `lang="en"` to `lang="ro"`, updated metadata (title, description) to Romanian |
| `src/app/page.tsx` | **Deleted** -- moved to `(public)/page.tsx` to enable layout wrapping |

## Auth Integration

- Header uses `auth()` from `@/server/auth` in the server component pattern. The `session.user` object is passed as a prop to the client component
- Account layout (`(account)/layout.tsx`) calls `await auth()` and redirects to `/login` when no session exists
- Admin layout (`(admin)/admin/layout.tsx`) calls `await auth()` and checks `session.user.role === "ADMIN"` -- redirects to `/login` if unauthorized
- The auth middleware (`src/middleware.ts`) continues to protect `/cont/*` and `/admin/*` at the edge, while the layouts enforce auth at the React level

## Build Verification

The project builds successfully with `npx next build`. Verified routes:

```
Route (app)
┌ ƒ /                  (public layout: header + footer)
├ ƒ /admin             (admin layout: admin sidebar)
├ ƒ /cont              (account layout: header + sidebar)
├ ○ /login             (auth page, no public layout)
├ ○ /inregistrare      (auth page, no public layout)
├ ƒ /api/auth/[...nextauth]
└ ƒ /api/trpc/[trpc]
```

No build errors, TypeScript errors, or compilation warnings (other than the pre-existing middleware-to-proxy deprecation notice).

## Key Decisions

1. **Server component pattern for header**: The `Header` server component calls `auth()` and passes user data as props to `HeaderClient`. This keeps secure session data server-side while allowing interactive elements (dropdowns, sheet) to be client components.

2. **No `asChild` prop**: This project's shadcn/ui is built on `@base-ui/react` which uses `render` prop instead of the `asChild` pattern. All link-wrapping uses direct child nesting.

3. **Route group structure**: Three route groups isolate layout concerns -- `(public)` for the main site, `(account)` for authenticated user pages, `(admin)` for admin pages. The `(auth)` group (from Task 4) remains layout-free.

4. **Romanian text**: All visible UI text is in Romanian per project conventions.

---

## Spec Compliance Fixes (Task 5 — Follow-up)

### Fix 1: Account Sidebar — Missing Nav Items
**File:** `src/components/layout/account-sidebar.tsx`

Added 4 missing nav items under the "Cumparaturi" group:
- `/cont/oferte` — Oferte
- `/cont/cereri` — Cererile mele
- `/cont/wallet` — Portofel
- `/cont/retururi` — Retururi

### Fix 2: Header — Cereri Link and +Vinde Button
**File:** `src/components/layout/header-client.tsx`

- Added `{ label: "Cereri", href: "/cereri" }` to the `navLinks` array (appears in both desktop nav and mobile sheet menu)
- Added `+ Vinde` button (`<Button variant="outline" size="sm">`) linking to `/produse/nou`, rendered conditionally when the user is authenticated — present in both desktop nav (after nav links) and mobile sheet menu

### Fix 3: Footer — Corrected Column Structure
**File:** `src/components/layout/footer.tsx`

Replaced previous footer with spec-aligned 4-column layout:
- **Col 1 — Smarty:** Despre noi, Contact, Blog
- **Col 2 — Cumparaturi:** Makeup, Ingrijire, Haine
- **Col 3 — Ajutor:** Cum functioneaza, Termeni si conditii, Politica de retur
- **Col 4 — Contact:** contact@smarty.ro, L-V: 09:00 - 18:00
- **Copyright:** (c) 2026 Smarty Marketplace. Toate drepturile rezervate.

### Verification
- `npx tsc --noEmit` — passed (0 errors)
- `npm run build` — passed (compiled successfully, all routes generated)

### Commit
`a8f28c8` — `fix: add missing nav items, header elements, and correct footer columns`
