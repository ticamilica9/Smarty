# Task 10: Cart & Checkout -- Implementation Report

## Summary

Implemented the client-side cart system with localStorage persistence and the checkout page with address form, shipping selection, and order summary.

## Files Created

1. **`src/components/cart/cart-provider.tsx`** -- React Context cart provider
   - `CartItem` type: productId, title, price, image, quantity, sellerId, sellerName
   - `CartContext` with `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `totalItems`, `totalPrice`
   - localStorage persistence under key `smarty-cart`
   - Hydration-safe: waits for mount before reading from localStorage

2. **`src/app/(public)/cos/page.tsx`** -- Cart page (client component)
   - Empty state with link to categories
   - Item list with image, title, seller name, quantity controls (+/-), remove button, line total
   - Order summary sidebar: subtotal, shipping info, total, checkout link, "continue shopping" link

3. **`src/app/(public)/checkout/page.tsx`** -- Checkout page (server component)
   - Auth guard via `auth()` -- redirects to `/login?redirect=/checkout` if not authenticated
   - Renders `CheckoutForm` with `userId` prop

4. **`src/app/(public)/checkout/checkout-form.tsx`** -- Checkout form (client component)
   - Shipping address section: city, postal code, address (textarea), phone
   - Shipping method selection: courier (2-4 days) or easybox (1-2 days locker)
   - Optional order notes textarea
   - Order summary sidebar with item list, subtotal, free shipping, total
   - Placeholder submit button (Stripe integration pending in Task 11)

## Files Modified

5. **`src/app/layout.tsx`** -- Added `CartProvider` wrapping children (outermost after SessionProvider)

## Key Design Decisions

- Cart is fully client-side (localStorage) since there's no Cart model in Prisma
- Stripe PaymentIntent integration is deferred to Task 11 -- submit button is a placeholder
- Uses `<Link><Button>` pattern (not `asChild`, which isn't supported by Base UI)
- All text in Romanian, consistent with the rest of the app
- Uses existing UI primitives (`Button`, `Input`, `Textarea`, `Label`, `Card`, `Separator`) and formatting (`formatRON`)

## Build Status

Build passes with all existing and new pages compiling successfully.

---

## Post-Task 10 Update: Wire Cart & Offer Buttons on Product Detail Page

### Summary

Wired up the three action buttons on the product detail page at `src/app/(public)/produse/[id]/page.tsx` to use the cart provider and tRPC offer.create mutation.

### Changes Made

**`src/app/(public)/produse/[id]/page.tsx`** (modified):
- Added imports: `useRouter` from `next/navigation`, `useCart` from `@/components/cart/cart-provider`, `toast` from `sonner`, `Loader2` and `ShoppingCart` from `lucide-react`, and Dialog/Label/Input UI components
- Added `useCart().addItem` integration with a `cartItem` object mapping product data to the `CartItem` format
- **"Cumpara acum" button**: calls `addItem()` then `router.push('/checkout')`
- **"Adauga in cos" button** (new): calls `addItem()` with a toast notification
- **"Trimite oferta" button**: opens a dialog with an amount input; validates amount < product price, then calls `trpc.offer.create.mutate()` with toast success/failure feedback
- All buttons are disabled while the offer mutation is pending to prevent double-submission

### Verification

- `npx tsc --noEmit` passes with zero errors
- `npm run build` succeeds
