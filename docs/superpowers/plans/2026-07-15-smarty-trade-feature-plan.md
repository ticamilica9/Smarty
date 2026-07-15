# Smarty — Funcționalitate "Accept schimb" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trade/barter functionality to Smarty product listings — sellers mark products as tradeable with optional interest notes and money difference preference; buyers propose trades via a dedicated form.

**Architecture:** Three Prisma fields on Product (acceptTrade, tradeInterests, acceptMoneyDifference) + three on Offer (type, tradeDescription, moneyDifference). tRPC procedures extended with Zod validation. Frontend: conditional trade section in product form, trade badge on cards, trade filter in search, trade proposal dialog on product detail page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7, tRPC, Zod, shadcn/ui

## Global Constraints

- All UI labels/text in Romanian
- Follow existing code patterns in product-form.tsx, product-card.tsx, product-filters.tsx
- Default values ensure backward compatibility (acceptTrade=false, type='MONEY')
- Deploy to VPS at 72.62.30.193 after all changes committed

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add trade fields to Product + Offer models |
| Modify | `src/server/api/routers/product.ts` | Extend create/update/search Zod inputs |
| Modify | `src/server/api/routers/offer.ts` | Extend create Zod input + logic for TRADE type |
| Modify | `src/components/product/product-form.tsx` | Add trade section (radio + conditional fields) |
| Modify | `src/components/product/product-card.tsx` | Add "Acceptă schimb" badge, extend interface |
| Modify | `src/components/product/product-filters.tsx` | Add "acceptTrade" filter checkbox |
| Modify | `src/app/(public)/produse/[id]/page.tsx` | Add trade info section + "Propune schimb" dialog |
| Modify | `src/app/(public)/categorii/[slug]/page.tsx` | Pass acceptTrade param to Prisma query |
| Modify | `src/lib/demo-data.ts` | Extend DemoProduct interface, add trade fields to 4 products |

---

### Task 1: Database — Add trade fields to Product and Offer models

**Files:**
- Modify: `smarty/prisma/schema.prisma:157-179` (Product model)
- Modify: `smarty/prisma/schema.prisma:189-206` (Offer model)

**Interfaces:**
- Produces: `Product.acceptTrade: Boolean`, `Product.tradeInterests: String?`, `Product.acceptMoneyDifference: Boolean`
- Produces: `Offer.type: String`, `Offer.tradeDescription: String?`, `Offer.moneyDifference: Float?`

- [ ] **Step 1: Add fields to Product model**

In `smarty/prisma/schema.prisma`, add after `shade` and `skinType` fields (after line 167):

```prisma
  acceptTrade           Boolean          @default(false)
  tradeInterests        String?          @db.Text
  acceptMoneyDifference Boolean          @default(false)
```

- [ ] **Step 2: Add fields to Offer model**

In `smarty/prisma/schema.prisma`, add after the `round` field (after line 197):

```prisma
  type              String           @default("MONEY")
  tradeDescription  String?          @db.Text
  moneyDifference   Float?
```

- [ ] **Step 3: Run Prisma migration**

```bash
cd smarty && npx prisma migrate dev --name add_trade_fields
```

Expected: Migration file created in `prisma/migrations/`, no errors.

- [ ] **Step 4: Verify migration applied**

```bash
cd smarty && npx prisma db push --preview-feature
```

Expected: "The database is already in sync with your Prisma schema."

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add trade/barter fields to Product and Offer models"
```

---

### Task 2: Demo data — Update demo products with trade info

**Files:**
- Modify: `smarty/src/lib/demo-data.ts:10-15` (DemoProduct interface)
- Modify: `smarty/src/lib/demo-data.ts:45-109` (demoProducts array)

**Interfaces:**
- Consumes: `Product.acceptTrade`, `Product.tradeInterests`, `Product.acceptMoneyDifference`
- Produces: Extended `DemoProduct` interface with trade fields

- [ ] **Step 1: Extend DemoProduct interface**

In `smarty/src/lib/demo-data.ts`, replace the DemoProduct interface (lines 10-15):

```typescript
export interface DemoProduct {
  id: string; sellerId: string; title: string; description: string;
  categoryId: string; condition: string; price: number; brand: string;
  shade: string; skinType: string; images: string[]; status: string;
  featured: boolean; createdAt: Date; updatedAt: Date;
  acceptTrade: boolean; tradeInterests: string | null; acceptMoneyDifference: boolean;
}
```

- [ ] **Step 2: Add trade fields to demo products**

Update 4 demo products to include trade fields. Replace the demoProducts array (lines 45-109) with the updated version that adds `acceptTrade`, `tradeInterests`, `acceptMoneyDifference` to each product:

```typescript
export const demoProducts: DemoProduct[] = [
  {
    id: 'prod-1', sellerId: 'user-1', title: 'Ruj Maybelline SuperStay Matte Ink - Nuanța 100',
    description: 'Ruj lichid mat, rezistență până la 16 ore. Folosit o singură dată, nuanța nu mi se potrivește. Culoare intensă, nu transferă.',
    categoryId: 'cat-2', condition: 'LIKE_NEW', price: 35, brand: 'Maybelline',
    shade: '100', skinType: '', images: ['https://picsum.photos/seed/ruj1/600/600', 'https://picsum.photos/seed/ruj1b/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-20'), updatedAt: new Date('2026-06-20'),
    acceptTrade: true, tradeInterests: 'Rujuri MAC nuanțe nude, gloss-uri Dior', acceptMoneyDifference: true,
  },
  {
    id: 'prod-2', sellerId: 'user-2', title: 'Fond de ten Estée Lauder Double Wear - 2N1',
    description: 'Fond de ten lichid, acoperire mare, finish natural. Culoarea 2N1 Desert Beige. Folosit ~20%, încă mai sunt ~25ml din 30ml.',
    categoryId: 'cat-4', condition: 'GOOD', price: 120, brand: 'Estée Lauder',
    shade: '2N1', skinType: 'Mixt', images: ['https://picsum.photos/seed/fdt1/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-25'), updatedAt: new Date('2026-06-25'),
    acceptTrade: false, tradeInterests: null, acceptMoneyDifference: false,
  },
  {
    id: 'prod-3', sellerId: 'user-1', title: 'Paletă de farduri Huda Beauty Rose Gold Remastered',
    description: 'Paletă iconică cu 18 nuanțe, de la mate la sclipitoare. Folosită doar 3 nuanțe, restul intacte. Oglindă inclusă.',
    categoryId: 'cat-3', condition: 'GOOD', price: 180, brand: 'Huda Beauty',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/paleta1/600/600', 'https://picsum.photos/seed/paleta1b/600/600', 'https://picsum.photos/seed/paleta1c/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-26'), updatedAt: new Date('2026-06-26'),
    acceptTrade: true, tradeInterests: 'Palete Anastasia Beverly Hills, perii profesionale', acceptMoneyDifference: true,
  },
  {
    id: 'prod-4', sellerId: 'user-3', title: 'Gloss Dior Addict Lip Maximizer - 001 Pink',
    description: 'Gloss de buze cu efect de volum. Nuanța 001 Pink, cea mai căutată. Nou, sigilat, primit cadou dar am deja unul.',
    categoryId: 'cat-2', condition: 'NEW', price: 150, brand: 'Dior',
    shade: '001', skinType: '', images: ['https://picsum.photos/seed/gloss1/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-27'), updatedAt: new Date('2026-06-27'),
    acceptTrade: false, tradeInterests: null, acceptMoneyDifference: false,
  },
  {
    id: 'prod-5', sellerId: 'user-2', title: 'Serum The Ordinary Niacinamide 10% + Zinc 1%',
    description: 'Serum pentru ten gras și mixt. Reglează sebumul, reduce porii. Folosit ~30%, mai sunt ~20ml din 30ml.',
    categoryId: 'cat-11', condition: 'GOOD', price: 40, brand: 'The Ordinary',
    shade: '', skinType: 'Gras', images: ['https://picsum.photos/seed/serum1/600/600', 'https://picsum.photos/seed/serum1b/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-22'), updatedAt: new Date('2026-06-22'),
    acceptTrade: false, tradeInterests: null, acceptMoneyDifference: false,
  },
  {
    id: 'prod-6', sellerId: 'user-1', title: 'Cremă hidratantă CeraVe Facial Moisturising Lotion',
    description: 'Cremă de față cu acid hialuronic și ceramide. Pentru ten normal spre uscat. Folosită 2-3 ori, cutia completă 52ml.',
    categoryId: 'cat-11', condition: 'LIKE_NEW', price: 50, brand: 'CeraVe',
    shade: '', skinType: 'Uscat', images: ['https://picsum.photos/seed/crema1/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-24'), updatedAt: new Date('2026-06-24'),
    acceptTrade: true, tradeInterests: 'Serumuri The Ordinary, creme hidratante', acceptMoneyDifference: false,
  },
  {
    id: 'prod-10', sellerId: 'user-3', title: 'Parfum YSL Black Opium - 50ml',
    description: 'Parfum Yves Saint Laurent Black Opium, 50ml, apa de parfum. Folosit ~15%, mirosul nu mi se mai potrivește. Cutie originală.',
    categoryId: 'cat-30', condition: 'GOOD', price: 280, brand: 'Yves Saint Laurent',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/parfum1/600/600', 'https://picsum.photos/seed/parfum1b/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-19'), updatedAt: new Date('2026-06-19'),
    acceptTrade: false, tradeInterests: null, acceptMoneyDifference: false,
  },
  {
    id: 'prod-11', sellerId: 'user-2', title: 'Scrub de corp Coconut Coffee Scrub',
    description: 'Scrub natural cu cafea și ulei de cocos. Exfoliază și hidratează. Nou, sigilat, 200g. Am cumpărat 2 din greșeală.',
    categoryId: 'cat-12', condition: 'NEW', price: 30, brand: 'The Body Shop',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/scrub1/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-28'), updatedAt: new Date('2026-06-28'),
    acceptTrade: true, tradeInterests: 'Produse îngrijire corp The Body Shop', acceptMoneyDifference: true,
  },
  {
    id: 'prod-12', sellerId: 'user-1', title: 'Set perii machiaj Real Techniques - 5 bucăți',
    description: 'Set de 5 perii profesionale: fond de ten, pudră, blush, blending (x2). Folosite 2-3 ori, spălate și dezinfectate.',
    categoryId: 'cat-1', condition: 'GOOD', price: 90, brand: 'Real Techniques',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/perii1/600/600'],
    status: 'ACTIVE', featured: false, createdAt: new Date('2026-06-18'), updatedAt: new Date('2026-06-18'),
    acceptTrade: false, tradeInterests: null, acceptMoneyDifference: false,
  },
]
```

Products that accept trade: prod-1 (Ruj Maybelline — acceptă diferență bani), prod-3 (Paletă Huda Beauty — acceptă diferență bani), prod-6 (Cremă CeraVe — NU acceptă diferență bani), prod-11 (Scrub The Body Shop — acceptă diferență bani).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/demo-data.ts
git commit -m "feat: add trade fields to demo products"
```

---

### Task 3: Update product tRPC router

**Files:**
- Modify: `smarty/src/server/api/routers/product.ts:22-34` (create input)
- Modify: `smarty/src/server/api/routers/product.ts:87-101` (update input)
- Modify: `smarty/src/server/api/routers/product.ts:138-149` (search input)
- Modify: `smarty/src/server/api/routers/product.ts:150-190` (search implementation)

**Interfaces:**
- Consumes: `Product.acceptTrade`, `Product.tradeInterests`, `Product.acceptMoneyDifference`
- Produces: Extended Zod input schemas for create, update, search

- [ ] **Step 1: Extend `create` procedure input**

In `smarty/src/server/api/routers/product.ts`, replace the create input (lines 23-34):

```typescript
    .input(
      z.object({
        title: z.string().min(1, 'Titlul este obligatoriu'),
        description: z.string().min(1, 'Descrierea este obligatorie'),
        categoryId: z.string().min(1, 'Categoria este obligatorie'),
        condition: productCondition,
        price: z.number().min(0.01, 'Pretul trebuie sa fie mai mare de 0'),
        brand: z.string().optional(),
        shade: z.string().optional(),
        skinType: z.string().optional(),
        images: z.array(z.string()).default([]),
        acceptTrade: z.boolean().default(false),
        tradeInterests: z.string().optional(),
        acceptMoneyDifference: z.boolean().default(false),
      }),
    )
```

The mutation body (lines 36-44) stays the same — `...input` spread handles new fields automatically since Prisma now has them.

- [ ] **Step 2: Extend `update` procedure input**

In `smarty/src/server/api/routers/product.ts`, replace the update input (lines 88-101):

```typescript
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        categoryId: z.string().optional(),
        condition: productCondition.optional(),
        price: z.number().min(0.01).optional(),
        brand: z.string().optional().nullable(),
        shade: z.string().optional().nullable(),
        skinType: z.string().optional().nullable(),
        images: z.array(z.string()).optional(),
        status: productStatus.optional(),
        acceptTrade: z.boolean().optional(),
        tradeInterests: z.string().optional().nullable(),
        acceptMoneyDifference: z.boolean().optional(),
      }),
    )
```

- [ ] **Step 3: Extend `search` procedure input**

In `smarty/src/server/api/routers/product.ts`, replace the search input (lines 139-149):

```typescript
      z.object({
        query: z.string().optional(),
        categoryId: z.string().optional(),
        condition: productCondition.optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.enum(['newest', 'price_asc', 'price_desc']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        acceptTrade: z.boolean().optional(),
      }),
    )
```

- [ ] **Step 4: Add acceptTrade filter to search implementation**

In `smarty/src/server/api/routers/product.ts`, inside the search `.query()` handler, after the price filter block (after line 170), add:

```typescript
      if (input.acceptTrade === true) {
        where.acceptTrade = true
      }
```

- [ ] **Step 5: Add trade fields to `offerWithIncludes` select**

In `smarty/src/server/api/routers/product.ts` — this step is not needed here; the trade-related fields on Product are returned by `...input` spread in create/update. For search/getById/getLatest/getMyProducts, Prisma returns all scalar fields by default unless using `select:` instead of `include:`. Since these procedures use `include:` (not `select:`), all scalar fields including the new ones are returned automatically.

No code change needed for the includes — the `productWithIncludes` constant (line 5-13) uses `include` with relations, so new scalar fields are returned automatically.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/server/api/routers/product.ts
git commit -m "feat: add trade fields to product create/update/search tRPC procedures"
```

---

### Task 4: Update offer tRPC router

**Files:**
- Modify: `smarty/src/server/api/routers/offer.ts:44-126` (create procedure)

**Interfaces:**
- Consumes: `Offer.type`, `Offer.tradeDescription`, `Offer.moneyDifference`
- Produces: Extended `offer.create` supporting both MONEY and TRADE offers

- [ ] **Step 1: Extend `offer.create` Zod input**

In `smarty/src/server/api/routers/offer.ts`, replace the `create` input (lines 45-49):

```typescript
    .input(
      z.object({
        productId: z.string().min(1),
        type: z.enum(['MONEY', 'TRADE']).default('MONEY'),
        amount: z.number().positive('Oferta trebuie sa fie mai mare decat 0').optional(),
        tradeDescription: z.string().min(1, 'Descrie ce oferi la schimb').optional(),
        moneyDifference: z.number().optional(),
      }).refine(
        (data) => {
          if (data.type === 'TRADE' && !data.tradeDescription) {
            return false
          }
          if (data.type === 'MONEY' && !data.amount) {
            return false
          }
          return true
        },
        { message: 'Completeaza toate campurile obligatorii' },
      ),
    )
```

- [ ] **Step 2: Update mutation logic for TRADE type**

Replace the mutation body of `create` (lines 51-126) to handle both offer types:

```typescript
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const product = await ctx.prisma.product.findUnique({
        where: { id: input.productId },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Produsul nu a fost gasit',
        })
      }

      // Cannot offer on own product
      if (product.sellerId === userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nu poti face o oferta pentru propriul produs',
        })
      }

      // For MONEY offers: validate amount
      if (input.type === 'MONEY') {
        if (!input.amount || input.amount >= product.price) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Oferta trebuie sa fie mai mica decat pretul afisat',
          })
        }
      }

      // For TRADE offers: verify product accepts trades
      if (input.type === 'TRADE') {
        if (!product.acceptTrade) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Acest produs nu accepta schimburi',
          })
        }
        if (input.moneyDifference !== undefined && !product.acceptMoneyDifference) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vanzatorul nu accepta diferenta de bani',
          })
        }
      }

      // Check for existing PENDING or COUNTERED offers on this product by this buyer
      const existingOffer = await ctx.prisma.offer.findFirst({
        where: {
          productId: input.productId,
          buyerId: userId,
          status: { in: ['PENDING', 'COUNTERED'] },
          expiresAt: { gt: new Date() },
        },
      })

      if (existingOffer) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ai deja o oferta activa pentru acest produs',
        })
      }

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

      const offer = await ctx.prisma.offer.create({
        data: {
          productId: input.productId,
          buyerId: userId,
          sellerId: product.sellerId,
          amount: input.amount ?? 0,
          type: input.type,
          tradeDescription: input.tradeDescription,
          moneyDifference: input.moneyDifference,
          round: 1,
          expiresAt,
        },
        include: offerWithIncludes,
      })

      const notificationMessage = input.type === 'TRADE'
        ? `Ai primit o propunere de schimb pentru "${product.title}"`
        : `Ai primit o oferta de ${(input.amount ?? 0).toFixed(2)} RON pentru "${product.title}"`

      sendNotification(product.sellerId, {
        type: 'OFFER_RECEIVED',
        title: input.type === 'TRADE' ? 'Propunere de schimb' : 'Oferta noua',
        message: notificationMessage,
        link: '/cont/oferte',
        metadata: { productId: input.productId, offerId: offer.id },
      }).catch(() => {
        /* fire-and-forget: notification failure must not break the mutation */
      })

      return offer
    }),
```

- [ ] **Step 2: Add new fields to `offerWithIncludes` select**

In `smarty/src/server/api/routers/offer.ts`, add to the `offerWithIncludes` constant (lines 6-33), after `updatedAt: true`:

```typescript
  type: true,
  tradeDescription: true,
  moneyDifference: true,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/offer.ts
git commit -m "feat: extend offer.create to support TRADE type"
```

---

### Task 5: Add trade section to product form

**Files:**
- Modify: `smarty/src/components/product/product-form.tsx`

**Interfaces:**
- Consumes: `trpc.product.create` (already expects acceptTrade, tradeInterests, acceptMoneyDifference from Task 3)
- Produces: UI for trade toggle and conditional fields

- [ ] **Step 1: Add state variables**

In `smarty/src/components/product/product-form.tsx`, after the existing state declarations (after line 51), add:

```typescript
  const [acceptTrade, setAcceptTrade] = useState(false)
  const [tradeInterests, setTradeInterests] = useState('')
  const [acceptMoneyDifference, setAcceptMoneyDifference] = useState(false)
```

- [ ] **Step 2: Add trade fields to submit handler**

In `smarty/src/components/product/product-form.tsx`, in the `handleSubmit` function, update the `createProduct.mutate` call (lines 106-116) to include the new fields:

```typescript
    createProduct.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      condition: condition as 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR',
      price: parseFloat(price),
      brand: brand.trim() || undefined,
      shade: shade.trim() || undefined,
      skinType: skinType.trim() || undefined,
      images,
      acceptTrade,
      tradeInterests: acceptTrade ? tradeInterests.trim() || undefined : undefined,
      acceptMoneyDifference: acceptTrade ? acceptMoneyDifference : false,
    })
```

- [ ] **Step 3: Add trade section JSX**

In `smarty/src/components/product/product-form.tsx`, insert the trade section between the Price block (after line 248) and the Optional fields block (before line 251):

```tsx
      {/* Trade / Schimb */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="text-sm font-semibold">Schimb</span>
        </div>

        {/* Accept trade toggle */}
        <div className="space-y-2">
          <Label>Accepti schimbul de produse?</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="acceptTrade"
                checked={acceptTrade}
                onChange={() => setAcceptTrade(true)}
                className="size-4 accent-primary"
              />
              <span className="text-sm">Accept schimb</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="acceptTrade"
                checked={!acceptTrade}
                onChange={() => {
                  setAcceptTrade(false)
                  setTradeInterests('')
                  setAcceptMoneyDifference(false)
                }}
                className="size-4 accent-primary"
              />
              <span className="text-sm">Nu accept schimb</span>
            </label>
          </div>
        </div>

        {/* Conditional trade fields */}
        {acceptTrade && (
          <>
            <div className="space-y-1">
              <Label htmlFor="tradeInterests">Ce ma intereseaza la schimb?</Label>
              <Textarea
                id="tradeInterests"
                value={tradeInterests}
                onChange={(e) => setTradeInterests(e.target.value)}
                placeholder="Ex: Rujuri MAC nuante inchise, palete farduri, parfumuri..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Optional — descrie ce tip de produse ai accepta la schimb.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pot oferi diferenta de bani?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="moneyDifference"
                    checked={acceptMoneyDifference}
                    onChange={() => setAcceptMoneyDifference(true)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Da</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="moneyDifference"
                    checked={!acceptMoneyDifference}
                    onChange={() => setAcceptMoneyDifference(false)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Nu</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/product/product-form.tsx
git commit -m "feat: add trade toggle and conditional fields to product form"
```

---

### Task 6: Add trade badge to product card

**Files:**
- Modify: `smarty/src/components/product/product-card.tsx:12-31` (ProductCardProduct interface)
- Modify: `smarty/src/components/product/product-card.tsx:74-81` (badge area)

**Interfaces:**
- Consumes: `Product.acceptTrade` from product data
- Produces: Green "Schimb" badge on tradeable products

- [ ] **Step 1: Extend ProductCardProduct interface**

In `smarty/src/components/product/product-card.tsx`, add to the `ProductCardProduct` interface (after line 18, before `status`):

```typescript
  acceptTrade?: boolean
```

Place it after `condition` and before `status`:

```typescript
export interface ProductCardProduct {
  id: string
  title: string
  price: number
  images: string[]
  condition: string
  acceptTrade?: boolean
  status: string
  // ... rest
}
```

- [ ] **Step 2: Add trade badge in JSX**

In `smarty/src/components/product/product-card.tsx`, after the condition badge (lines 74-81), add:

```tsx
          {/* Trade badge */}
          {product.acceptTrade && (
            <Badge
              className="absolute left-2 top-10 bg-green-100/90 text-green-800 text-xs backdrop-blur-xs"
            >
              🔄 Schimb
            </Badge>
          )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/product/product-card.tsx
git commit -m "feat: add trade badge to product card"
```

---

### Task 7: Add trade filter to product filters

**Files:**
- Modify: `smarty/src/components/product/product-filters.tsx`

**Interfaces:**
- Consumes: URL param `?acceptTrade=true`
- Produces: Checkbox filter to show only tradeable products

- [ ] **Step 1: Add acceptTrade filter state and handlers**

In `smarty/src/components/product/product-filters.tsx`, after line 30 (`const activePriceMax = searchParams.get('pretMax')`), add:

```typescript
  const activeAcceptTrade = searchParams.get('acceptTrade') === 'true'
```

- [ ] **Step 2: Add acceptTrade to createQueryString**

In `smarty/src/components/product/product-filters.tsx`, in the `createQueryString` callback (lines 33-58), add an `else if` branch for 'acceptTrade' after the price branch (after line 52):

```typescript
      } else if (name === 'acceptTrade') {
        if (activeAcceptTrade) {
          params.delete('acceptTrade')
        } else {
          params.set('acceptTrade', 'true')
        }
      }
```

- [ ] **Step 3: Add acceptTrade to hasActiveFilters check**

In `smarty/src/components/product/product-filters.tsx`, update line 64:

```typescript
  const hasActiveFilters = activeConditions.length > 0 || activePriceMin || activePriceMax || activeAcceptTrade
```

- [ ] **Step 4: Add trade filter UI**

In `smarty/src/components/product/product-filters.tsx`, add a new section after the price filter section (after line 164, before `</aside>`):

```tsx
      <Separator />

      {/* Trade / Schimb filter */}
      <div>
        <h4 className="mb-3 text-sm font-medium">Schimb</h4>
        <div className="space-y-2">
          <button
            onClick={() => {
              router.push(`${pathname}?${createQueryString('acceptTrade', 'true')}`)
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
              activeAcceptTrade && 'bg-muted font-medium',
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-xs border',
                activeAcceptTrade && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {activeAcceptTrade && (
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            Doar produse care accepta schimb
          </button>
        </div>
      </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/product/product-filters.tsx
git commit -m "feat: add trade filter checkbox to product filters"
```

---

### Task 8: Pass acceptTrade filter in category page server component

**Files:**
- Modify: `smarty/src/app/(public)/categorii/[slug]/page.tsx:50-85`

**Interfaces:**
- Consumes: URL param `?acceptTrade=true`
- Produces: Prisma query filtered by acceptTrade

- [ ] **Step 1: Read acceptTrade param and add to Prisma query**

In `smarty/src/app/(public)/categorii/[slug]/page.tsx`, after line 60 (`const priceMax = ...`), add:

```typescript
  const acceptTrade = sp.acceptTrade === 'true' ? true : undefined
```

Then update the Prisma `where` clause (lines 62-74) to include acceptTrade:

```typescript
  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      status: 'ACTIVE',
      ...(validConditions && validConditions.length > 0 ? { condition: { in: validConditions } } : {}),
      ...(priceMin !== undefined || priceMax !== undefined
        ? {
            price: {
              ...(priceMin !== undefined ? { gte: priceMin } : {}),
              ...(priceMax !== undefined ? { lte: priceMax } : {}),
            },
          }
        : {}),
      ...(acceptTrade === true ? { acceptTrade: true } : {}),
    },
    // ... rest unchanged
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/categorii/[slug]/page.tsx"
git commit -m "feat: add acceptTrade filter to category listing page"
```

---

### Task 9: Add trade section and propose dialog to product detail page

**Files:**
- Modify: `smarty/src/app/(public)/produse/[id]/page.tsx`

**Interfaces:**
- Consumes: `Product.acceptTrade`, `Product.tradeInterests`, `Product.acceptMoneyDifference` from `trpc.product.getById`
- Produces: Trade info section + "Propune un schimb" button + trade proposal dialog

- [ ] **Step 1: Add trade proposal dialog state**

In `smarty/src/app/(public)/produse/[id]/page.tsx`, after the existing offer dialog state (after line 48), add:

```typescript
  // Trade dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false)
  const [tradeDescription, setTradeDescription] = useState('')
  const [tradeMoneyDiff, setTradeMoneyDiff] = useState('')
```

- [ ] **Step 2: Add trade offer mutation**

In `smarty/src/app/(public)/produse/[id]/page.tsx`, after the createOffer mutation (after line 61), add:

```typescript
  // Trade offer mutation
  const createTradeOffer = trpc.offer.create.useMutation({
    onSuccess: () => {
      toast.success('Propunerea ta de schimb a fost trimisa!')
      setTradeDialogOpen(false)
      setTradeDescription('')
      setTradeMoneyDiff('')
      utils.offer.getMyOffers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
```

- [ ] **Step 3: Add submit handler for trade proposal**

In `smarty/src/app/(public)/produse/[id]/page.tsx`, after the `handleSubmitOffer` function (after line 129), add:

```typescript
  const handleSubmitTrade = () => {
    if (!tradeDescription.trim()) {
      toast.error('Descrie ce oferi la schimb')
      return
    }
    createTradeOffer.mutate({
      productId: product.id,
      type: 'TRADE',
      tradeDescription: tradeDescription.trim(),
      moneyDifference: tradeMoneyDiff ? parseFloat(tradeMoneyDiff) : undefined,
    })
  }
```

- [ ] **Step 4: Add trade info section in JSX**

In `smarty/src/app/(public)/produse/[id]/page.tsx`, insert the trade section between the description block (after line 267) and the Separator before seller info (before line 269). Replace the space between the description `</div>` and `<Separator />`:

```tsx
          {/* Trade info */}
          {product.acceptTrade && (
            <>
              <Separator />
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔄</span>
                  <h3 className="text-sm font-semibold text-green-900">
                    Vanzatorul accepta schimb
                  </h3>
                </div>

                {product.tradeInterests && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-800 mb-1">
                      Ce il intereseaza:
                    </p>
                    <p className="text-sm text-green-700">
                      {product.tradeInterests}
                    </p>
                  </div>
                )}

                <div className="mb-3">
                  {product.acceptMoneyDifference ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      ✅ Accepta diferenta de bani
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      ❌ Nu accepta diferenta de bani
                    </Badge>
                  )}
                </div>

                {!isOwner && session?.user && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-300 text-green-800 hover:bg-green-100 hover:text-green-900"
                    onClick={() => setTradeDialogOpen(true)}
                    disabled={createTradeOffer.isPending}
                  >
                    {createTradeOffer.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <span className="text-lg mr-1">🔄</span>
                    )}
                    Propune un schimb
                  </Button>
                )}
              </div>
            </>
          )}
```

- [ ] **Step 5: Add trade proposal dialog**

In `smarty/src/app/(public)/produse/[id]/page.tsx`, add the trade dialog after the existing offer dialog (after line 426, before `</div>` [the outer container]):

```tsx
      {/* Trade proposal dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propune un schimb</DialogTitle>
            <DialogDescription>
              Descrie ce produs oferi la schimb pentru <strong>{product.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-description">
                Ce oferi la schimb? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="trade-description"
                placeholder="Ex: Iti ofer la schimb un ruj Dior nuanta 999, folosit o singura data..."
                rows={3}
                value={tradeDescription}
                onChange={(e) => setTradeDescription(e.target.value)}
              />
            </div>

            {product.acceptMoneyDifference && (
              <div className="space-y-2">
                <Label htmlFor="trade-money-diff">
                  Diferenta de bani (RON)
                </Label>
                <Input
                  id="trade-money-diff"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50 (suma pe care o oferi in plus)"
                  value={tradeMoneyDiff}
                  onChange={(e) => setTradeMoneyDiff(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — lasa gol daca propui un schimb fara diferenta de bani.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTradeDialogOpen(false)
                setTradeDescription('')
                setTradeMoneyDiff('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitTrade}
              disabled={!tradeDescription.trim() || createTradeOffer.isPending}
            >
              {createTradeOffer.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Trimite propunerea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd smarty && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/produse/[id]/page.tsx"
git commit -m "feat: add trade section and propose dialog to product detail page"
```

---

### Task 10: Build, verify, and deploy to VPS

**Files:**
- No file changes — build + deploy only

**Interfaces:**
- Consumes: All previous task outputs
- Produces: Live deployed feature on VPS

- [ ] **Step 1: Run full build locally**

```bash
cd smarty && npm run build
```

Expected: Build succeeds, no errors. All routes compile.

- [ ] **Step 2: Run lint**

```bash
cd smarty && npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Push all commits to remote**

```bash
cd "C:/Users/activ/Projects/SIte-ul lu' asta" && git push origin main
```

Expected: All commits pushed successfully.

- [ ] **Step 4: SSH to VPS and deploy**

```bash
ssh root@72.62.30.193
cd /opt/smarty
git pull
npm install
npx prisma migrate deploy
npx prisma generate
pm2 restart smarty
pm2 logs smarty --lines 20
```

Expected: 
- Migration applied without errors
- PM2 restarts smarty successfully
- Logs show "Ready in" or "started server"

- [ ] **Step 5: Verify the deployment**

```bash
curl -s -o /dev/null -w '%{http_code}' https://smarty.ro 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://72.62.30.193
```

Expected: HTTP 200 (or 307 redirect to HTTPS).

- [ ] **Step 6: Manual verification checklist**

Visit the site and verify:
1. Create a new product — see trade toggle section in form
2. Toggle "Accept schimb" ON — see conditional fields appear
3. Submit product with trade fields — product is created
4. View product detail — see green trade info box
5. Product cards — see "🔄 Schimb" badge on tradeable products
6. Category page — filter by "Doar produse care accepta schimb"
7. Click "Propune un schimb" on a tradeable product — dialog opens
8. Submit a trade proposal — success toast appears
9. View tradeable products as owner — see "Acesta este anuntul tau" (no trade button)
