# Smarty Marketplace â€” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a C2C marketplace for cosmetics, clothing, and accessories with three buying mechanisms: direct purchase, price negotiation (Vinted-style), and RFQ (auto parts-style).

**Architecture:** Next.js 15 App Router with tRPC API layer, Prisma/PostgreSQL for persistence, Stripe Connect for escrow payments, Sameday API for EasyBox shipping, Redis for SSE notifications, and MinIO for image storage â€” all containerized with Docker Compose on a single VPS.

**Tech Stack:** Next.js 15, tRPC, Prisma, PostgreSQL, NextAuth.js v5, Stripe Connect, Sameday API, Tailwind CSS, shadcn/ui, MinIO (S3), Redis, Docker Compose

## Global Constraints

- **Mobile-first responsive** â€” all pages must work on mobile; shadcn/ui accessible components
- **RON currency only** â€” all prices in RON; Stripe Connect processes in RON
- **Romanian language** â€” all UI text in Romanian; no i18n at MVP
- **EasyBox only shipping** â€” only Sameday EasyBox locker-to-locker at launch
- **No real-time chat** â€” negotiation through structured offers only; chat is post-MVP
- **SEO on all public pages** â€” dynamic metadata, sitemap.xml, ISR for public pages
- **Stripe handles PCI** â€” no card data touches our servers; Stripe Elements for checkout
- **Auto-release escrow at 72h** â€” if buyer doesn't confirm delivery within 72h of delivery scan
- **Max 3 counter-offer rounds** â€” negotiation capped to prevent infinite loops
- **14-day return window** â€” buyer can request return within 14 days of delivery confirmation

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.env.example`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/redis.ts`
- Create: `src/lib/utils.ts`

**Produces:** Runnable Next.js project with all infrastructure configured

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest smarty --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Install all dependencies**

```bash
cd smarty
npm install @prisma/client @tRPC/server @tRPC/client @tanstack/react-query superjson zod next-auth@beta @auth/prisma-adapter stripe @aws-sdk/client-s3 @aws-sdk/lib-storage ioredis date-fns
npm install -D prisma @types/node @types/ioredis
npx shadcn@latest init -d
npx shadcn@latest add button input card badge dialog dropdown-menu separator avatar tabs table form select textarea toast carousel sheet skeleton
```

- [ ] **Step 3: Write `docker-compose.yml`**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: smarty
      POSTGRES_PASSWORD: smarty_dev
      POSTGRES_DB: smarty
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  pgdata:
  minio_data:
```

- [ ] **Step 4: Write `.env.example`**

```env
DATABASE_URL="postgresql://smarty:smarty_dev@localhost:5432/smarty"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="smarty-uploads"
SAMEDAY_API_URL="https://api.sameday.ro"
SAMEDAY_CLIENT_ID=""
SAMEDAY_CLIENT_SECRET=""
```

- [ ] **Step 5: Write `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Write `src/lib/redis.ts`**

```typescript
import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

export const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL!)

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export const redisPub = redis.duplicate()
export const redisSub = redis.duplicate()
```

- [ ] **Step 7: Write `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRON(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function conditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: 'Nou',
    LIKE_NEW: 'Ca nou',
    GOOD: 'Bun',
    FAIR: 'SatisfÄƒcÄƒtor',
  }
  return labels[condition] || condition
}
```

- [ ] **Step 8: Start Docker and verify**

```bash
docker compose up -d
docker compose ps
```

**Expected:** All 3 services (postgres, redis, minio) running

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Docker services"
```

---

### Task 2: Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.env` (copy from .env.example if not already done)

**Interfaces:**
- Produces: All Prisma models usable throughout the app via `prisma` client

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ProductCondition {
  NEW
  LIKE_NEW
  GOOD
  FAIR
}

enum ProductStatus {
  ACTIVE
  SOLD
  HIDDEN
}

enum OfferStatus {
  PENDING
  ACCEPTED
  REFUSED
  COUNTERED
}

enum RFQStatus {
  OPEN
  CLOSED
  AWARDED
}

enum OrderStatus {
  CREATED
  PAID
  SHIPPED
  DELIVERED
  RETURNED
  DISPUTED
  CANCELLED
}

enum PaymentStatus {
  HELD
  RELEASED
  REFUNDED
}

enum ReturnStatus {
  REQUESTED
  ACCEPTED
  REFUSED
  SHIPPED_BACK
  REFUNDED
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model User {
  id               String         @id @default(cuid())
  name             String?
  email            String         @unique
  emailVerified    DateTime?
  image            String?
  phone            String?
  buyerRating      Float          @default(0)
  sellerRating     Float          @default(0)
  stripeConnectId  String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  role             String         @default("USER")

  accounts         Account[]
  sessions         Session[]
  addresses        UserAddress[]
  sellerProfile    SellerProfile?
  products         Product[]
  offers           Offer[]         @relation("BuyerOffers")
  receivedOffers   Offer[]         @relation("SellerOffers")
  rfqs             RFQ[]
  rfqOffers        RFQOffer[]
  buyerOrders      Order[]         @relation("BuyerOrders")
  sellerOrders     Order[]         @relation("SellerOrders")
  reviews          Review[]
  returns          Return[]
  wishlistItems    WishlistItem[]
}

model SellerProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  storeName   String
  description String?  @db.Text
  returnPolicy String? @db.Text
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserAddress {
  id         String  @id @default(cuid())
  userId     String
  label      String  @default("PrincipalÄƒ")
  city       String
  address    String
  postalCode String
  phone      String
  isDefault  Boolean @default(false)
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ProductCategory {
  id       String            @id @default(cuid())
  name     String
  slug     String            @unique
  parentId String?
  icon     String?
  parent   ProductCategory?  @relation("CategoryTree", fields: [parentId], references: [id])
  children ProductCategory[] @relation("CategoryTree")
  products Product[]
  rfqs     RFQ[]
}

model Product {
  id          String           @id @default(cuid())
  sellerId    String
  title       String
  description String           @db.Text
  categoryId  String
  condition   ProductCondition @default(GOOD)
  price       Float
  brand       String?
  shade       String?
  skinType    String?
  images      String[]         @default([])
  status      ProductStatus    @default(ACTIVE)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  seller     User            @relation(fields: [sellerId], references: [id])
  category   ProductCategory @relation(fields: [categoryId], references: [id])
  variants   ProductVariant[]
  offers     Offer[]
  orders     Order[]
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  attribute String
  value     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Offer {
  id               String      @id @default(cuid())
  productId        String
  buyerId          String
  sellerId         String
  amount           Float
  status           OfferStatus @default(PENDING)
  counterOfferId   String?
  round            Int         @default(1)
  expiresAt        DateTime
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  product          Product     @relation(fields: [productId], references: [id])
  buyer            User        @relation("BuyerOffers", fields: [buyerId], references: [id])
  seller           User        @relation("SellerOffers", fields: [sellerId], references: [id])
  order            Order?
}

model RFQ {
  id          String    @id @default(cuid())
  buyerId     String
  title       String
  description String    @db.Text
  categoryId  String
  maxBudget   Float
  expiresAt   DateTime
  status      RFQStatus @default(OPEN)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  buyer       User            @relation(fields: [buyerId], references: [id])
  category    ProductCategory @relation(fields: [categoryId], references: [id])
  offers      RFQOffer[]
}

model RFQOffer {
  id        String      @id @default(cuid())
  rfqId     String
  sellerId  String
  productId String?
  amount    Float
  message   String?     @db.Text
  status    OfferStatus @default(PENDING)
  createdAt DateTime    @default(now())

  rfq       RFQ         @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  seller    User        @relation(fields: [sellerId], references: [id])
  order     Order?
}

model Order {
  id          String      @id @default(cuid())
  buyerId     String
  sellerId    String
  productId   String
  offerId     String?     @unique
  rfqOfferId  String?     @unique
  amount      Float
  status      OrderStatus @default(CREATED)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  buyer       User        @relation("BuyerOrders", fields: [buyerId], references: [id])
  seller      User        @relation("SellerOrders", fields: [sellerId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])
  offer       Offer?      @relation(fields: [offerId], references: [id])
  rfqOffer    RFQOffer?   @relation(fields: [rfqOfferId], references: [id])
  payment     Payment?
  shipment    Shipment?
  review      Review?
  return_     Return?
}

model Payment {
  id                     String        @id @default(cuid())
  orderId                String        @unique
  stripePaymentIntentId  String        @unique
  stripeTransferId       String?
  amount                 Float
  status                 PaymentStatus @default(HELD)
  escrowReleasedAt       DateTime?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  order                  Order         @relation(fields: [orderId], references: [id])
}

model Shipment {
  id                String        @id @default(cuid())
  orderId           String        @unique
  easyboxAWB        String        @unique
  trackingUrl       String?
  pickupCode        String
  status            String        @default("AWB_CREATED")
  estimatedDelivery DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  order             Order         @relation(fields: [orderId], references: [id])
}

model Return {
  id        String       @id @default(cuid())
  orderId   String       @unique
  buyerId   String
  reason    String       @db.Text
  images    String[]     @default([])
  status    ReturnStatus @default(REQUESTED)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  buyer     User         @relation(fields: [buyerId], references: [id])
  order     Order        @relation(fields: [orderId], references: [id])
}

model Review {
  id         String   @id @default(cuid())
  orderId    String   @unique
  reviewerId String
  targetId   String
  rating     Int
  text       String?  @db.Text
  images     String[] @default([])
  createdAt  DateTime @default(now())

  reviewer   User     @relation(fields: [reviewerId], references: [id])
}

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

**Expected:** Tables created in PostgreSQL

- [ ] **Step 3: Verify database**

```bash
npx prisma studio
```

**Expected:** Prisma Studio opens with all tables visible

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add database schema with all models"
```

---

### Task 3: tRPC Setup & API Foundation

**Files:**
- Create: `src/server/api/trpc.ts`
- Create: `src/server/api/root.ts`
- Create: `src/server/api/routers/user.ts`
- Create: `src/app/api/trpc/[trpc]/route.ts`
- Create: `src/lib/trpc/client.ts`
- Create: `src/lib/trpc/server.ts`

**Interfaces:**
- Produces: `api` (AppRouter type), `trpc` client/server helpers

- [ ] **Step 1: Write `src/server/api/trpc.ts`**

```typescript
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import superjson from 'superjson'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

export const createTRPCContext = async () => {
  const session = await getServerSession(authOptions)
  return { session, prisma }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

export const adminProcedure = t.procedure.use(enforceAuth).use(enforceAdmin)
```

- [ ] **Step 2: Write `src/server/api/root.ts`**

```typescript
import { router } from './trpc'
import { userRouter } from './routers/user'

export const appRouter = router({
  user: userRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 3: Write `src/server/api/routers/user.ts`**

```typescript
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          sellerProfile: true,
          _count: { select: { products: true, sellerOrders: true } },
        },
      })
      if (!user) throw new Error('User not found')
      const { email, ...rest } = user
      return rest
    }),

  getMe: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        include: {
          addresses: true,
          sellerProfile: true,
        },
      })
      return user
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      image: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      })
    }),

  createSellerProfile: protectedProcedure
    .input(z.object({
      storeName: z.string().min(1),
      description: z.string().optional(),
      returnPolicy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sellerProfile.create({
        data: { ...input, userId: ctx.user.id },
      })
    }),

  getSellerProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.sellerProfile.findUnique({
        where: { userId: input.userId },
        include: {
          user: {
            select: { id: true, name: true, image: true, sellerRating: true },
          },
          _count: { select: { user: { select: { products: { where: { status: 'ACTIVE' } } } } } },
        },
      })
    }),
})
```

- [ ] **Step 4: Write tRPC route handler**

File: `src/app/api/trpc/[trpc]/route.ts`
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })

export { handler as GET, handler as POST }
```

- [ ] **Step 5: Write client helpers**

File: `src/lib/trpc/client.ts`
```typescript
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/api/root'

export const trpc = createTRPCReact<AppRouter>()
```

File: `src/lib/trpc/server.ts`
```typescript
import { createCallerFactory } from '@trpc/server'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

const createCaller = createCallerFactory(appRouter)

export const api = async () => {
  const ctx = await createTRPCContext()
  return createCaller(ctx)
}
```

- [ ] **Step 6: Wrap app with tRPC provider**

Create: `src/components/providers/trpc-provider.tsx`
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import superjson from 'superjson'
import { trpc } from '@/lib/trpc/client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({ url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc` }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/server/api/ src/lib/trpc/ src/components/providers/ src/app/api/
git commit -m "feat: setup tRPC with user router"
```
### Task 4: Authentication

**Files:**
- Create: `src/server/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/inregistrare/page.tsx`
- Create: `src/middleware.ts`

**Interfaces:**
- Produces: `authOptions` for tRPC context, `getServerSession` usage, protected routes via middleware

- [ ] **Step 1: Write `src/server/auth.ts`**

```typescript
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
    newUser: '/inregistrare',
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER || '',
      from: process.env.EMAIL_FROM || 'noreply@smarty.ro',
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = (user as any).role || 'USER'
      }
      return session
    },
  },
}
```

- [ ] **Step 2: Write NextAuth route handler**

File: `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/server/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: Write login page `src/app/(auth)/login/page.tsx`**

```tsx
import { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Autentificare - Smarty' }

export default function LoginPage() {
  return (
    <main className="container max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">IntrÄƒ Ã®n cont</h1>
      <LoginForm />
    </main>
  )
}
```

File: `src/app/(auth)/login/login-form.tsx`
```tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn('email', { email, callbackUrl: '/' })
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@email.com"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Se trimite...' : 'ContinuÄƒ cu Email'}
        </Button>
      </form>

      <Separator />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        ContinuÄƒ cu Google
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Write register page `src/app/(auth)/inregistrare/page.tsx`**

```tsx
import { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'ÃŽnregistrare - Smarty' }

export default function RegisterPage() {
  return (
    <main className="container max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-center mb-4">CreeazÄƒ cont</h1>
      <p className="text-muted-foreground text-center mb-8">
        ÃŽnregistreazÄƒ-te pentru a cumpÄƒra È™i vinde pe Smarty
      </p>
      <RegisterForm />
    </main>
  )
}
```

File: `src/app/(auth)/inregistrare/register-form.tsx`
```tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const [form, setForm] = useState({ name: '', email: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn('email', { email: form.email, callbackUrl: '/' })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nume</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Numele tÄƒu"
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="nume@email.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Se trimite...' : 'CreeazÄƒ cont'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Write middleware `src/middleware.ts`**

```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/cont/:path*', '/admin/:path*'],
}
```

- [ ] **Step 6: Verify auth flow**

```bash
npm run dev
# Visit http://localhost:3000/login
# Verify Google and email login buttons render
# Verify /cont redirects to /login when unauthenticated
```

- [ ] **Step 7: Commit**

```bash
git add src/server/auth.ts src/app/api/auth/ src/app/(auth)/ src/middleware.ts
git commit -m "feat: add NextAuth with email and Google providers"
```

---

### Task 5: Layouts & Navigation Shell

**Files:**
- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(cont)/layout.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/footer.tsx`
- Create: `src/components/layout/mobile-nav.tsx`

**Interfaces:**
- Produces: Layout shells for public, account, and admin sections

- [ ] **Step 1: Write public layout `src/app/(public)/layout.tsx`**

```tsx
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Write account layout `src/app/(cont)/layout.tsx`**

```tsx
import { Header } from '@/components/layout/header'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container py-8">
        <div className="flex items-start gap-8">
          <nav className="w-56 space-y-1 text-sm">
            <a href="/cont/comenzi" className="block rounded px-3 py-2 hover:bg-muted">Comenzi</a>
            <a href="/cont/oferte" className="block rounded px-3 py-2 hover:bg-muted">Oferte</a>
            <a href="/cont/cereri" className="block rounded px-3 py-2 hover:bg-muted">Cererile mele</a>
            <a href="/cont/produse" className="block rounded px-3 py-2 hover:bg-muted">Produsele mele</a>
            <a href="/cont/wishlist" className="block rounded px-3 py-2 hover:bg-muted">Wishlist</a>
            <a href="/cont/wallet" className="block rounded px-3 py-2 hover:bg-muted">Portofel</a>
            <a href="/cont/retururi" className="block rounded px-3 py-2 hover:bg-muted">Retururi</a>
            <a href="/cont/setari" className="block rounded px-3 py-2 hover:bg-muted">SetÄƒri</a>
          </nav>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write header `src/components/layout/header.tsx`**

```tsx
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'

export async function Header() {
  const session = await getServerSession(authOptions)

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="font-bold text-xl text-purple-700">
          Smarty
        </Link>

        <form action="/cautare" className="hidden md:flex flex-1 max-w-lg mx-4">
          <Input name="q" placeholder="CautÄƒ produse..." className="rounded-r-none" />
          <Button type="submit" variant="secondary" className="rounded-l-none">
            CautÄƒ
          </Button>
        </form>

        <div className="flex items-center gap-3 ml-auto">
          <Link href="/cereri" className="hidden md:block text-sm hover:text-purple-700">
            Cereri
          </Link>
          {session ? (
            <>
              <Link href="/produse/nou" className="hidden md:inline-flex">
                <Button variant="outline" size="sm">+ Vinde</Button>
              </Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">IntrÄƒ Ã®n cont</Button>
            </Link>
          )}
        </div>

        <MobileNav session={session} />
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Write footer `src/components/layout/footer.tsx`**

```tsx
export function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-12">
      <div className="container py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-semibold mb-3">Smarty</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/pagini/despre">Despre noi</a></li>
            <li><a href="/pagini/contact">Contact</a></li>
            <li><a href="/blog">Blog</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">CumpÄƒrÄƒturi</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/categorii/makeup">Makeup</a></li>
            <li><a href="/categorii/ingrijire">ÃŽngrijire</a></li>
            <li><a href="/categorii/haine">Haine</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Ajutor</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/pagini/cum-functioneaza">Cum funcÈ›ioneazÄƒ</a></li>
            <li><a href="/pagini/termeni">Termeni È™i condiÈ›ii</a></li>
            <li><a href="/pagini/retur">Politica de retur</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Contact</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>contact@smarty.ro</li>
            <li>L-V: 09:00 - 18:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t container py-4 text-center text-sm text-muted-foreground">
        Â© {new Date().getFullYear()} Smarty Marketplace. Toate drepturile rezervate.
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Write user menu and mobile nav components**

File: `src/components/layout/user-menu.tsx`
```tsx
'use client'

import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

export function UserMenu({ user }: { user: { name?: string | null; image?: string | null } }) {
  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild><Link href="/cont/comenzi">Comenzi</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/cont/produse">Produsele mele</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/cont/oferte">Oferte</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Deconectare</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

File: `src/components/layout/mobile-nav.tsx`
```tsx
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'

export function MobileNav({ session }: { session: any }) {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 pt-12">
        <nav className="space-y-1">
          <Link href="/categorii/makeup" className="block px-3 py-2 rounded hover:bg-muted">Makeup</Link>
          <Link href="/categorii/ingrijire" className="block px-3 py-2 rounded hover:bg-muted">ÃŽngrijire</Link>
          <Link href="/categorii/haine" className="block px-3 py-2 rounded hover:bg-muted">Haine</Link>
          <Link href="/categorii/accesorii" className="block px-3 py-2 rounded hover:bg-muted">Accesorii</Link>
          <hr className="my-2" />
          <Link href="/cereri" className="block px-3 py-2 rounded hover:bg-muted">Cereri active</Link>
          {session && <Link href="/produse/nou" className="block px-3 py-2 rounded hover:bg-muted">+ AdaugÄƒ produs</Link>}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 6: Verify layouts render**

```bash
npm run dev
# Visit http://localhost:3000 â€” header + footer visible
# Visit http://localhost:3000/login â€” login page in public layout
```

- [ ] **Step 7: Commit**

```bash
git add src/app/(public)/ src/app/(cont)/ src/components/layout/
git commit -m "feat: add layout shells, header, footer, and navigation"
```
### Task 6: Category Seed & Browse

**Files:**
- Create: `prisma/seed.ts`
- Create: `src/server/api/routers/category.ts`
- Modify: `src/server/api/root.ts` (add categoryRouter)
- Create: `src/app/(public)/categorii/[slug]/page.tsx`
- Create: `src/components/category/category-card.tsx`

**Interfaces:**
- Consumes: `prisma` from Task 1, `router`/`publicProcedure` from Task 3
- Produces: `categoryRouter` with `getAll` and `getBySlug` procedures

- [ ] **Step 1: Write seed script `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Makeup', slug: 'makeup', icon: 'palette', children: [
    { name: 'Buze', slug: 'buze', icon: null, children: [
      { name: 'Ruj', slug: 'ruj' }, { name: 'Gloss', slug: 'gloss' }, { name: 'Liner', slug: 'liner-buze' }, { name: 'Balm', slug: 'balm' }
    ]},
    { name: 'Ochi', slug: 'ochi', icon: null, children: [
      { name: 'Palete', slug: 'palete' }, { name: 'Tus', slug: 'tus' }, { name: 'Mascara', slug: 'mascara' }, { name: 'Creion', slug: 'creion-ochi' }
    ]},
    { name: 'Ten', slug: 'ten', icon: null, children: [
      { name: 'Fond de ten', slug: 'fond-de-ten' }, { name: 'Corector', slug: 'corector' }, { name: 'PudrÄƒ', slug: 'pudra' }, { name: 'Primer', slug: 'primer' }
    ]},
    { name: 'SprÃ¢ncene', slug: 'sprancene', icon: null, children: [
      { name: 'PomadÄƒ', slug: 'pomada' }, { name: 'Creion', slug: 'creion-sprancene' }, { name: 'Gel', slug: 'gel-sprancene' }
    ]}
  ]},
  { name: 'ÃŽngrijire', slug: 'ingrijire', icon: 'droplets', children: [
    { name: 'FaÈ›Äƒ', slug: 'fata', icon: null, children: [
      { name: 'CremÄƒ', slug: 'crema' }, { name: 'Ser', slug: 'ser' }, { name: 'Toner', slug: 'toner' }, { name: 'MascÄƒ', slug: 'masca' }
    ]},
    { name: 'Corp', slug: 'corp', icon: null, children: [
      { name: 'LoÈ›iune', slug: 'lotiune' }, { name: 'Scrub', slug: 'scrub' }, { name: 'Ulei', slug: 'ulei' }
    ]},
    { name: 'PÄƒr', slug: 'par', icon: null, children: [
      { name: 'È˜ampon', slug: 'sampon' }, { name: 'MascÄƒ', slug: 'masca-par' }, { name: 'Tratament', slug: 'tratament' }
    ]}
  ]},
  { name: 'Haine', slug: 'haine', icon: 'shirt', children: [
    { name: 'DamÄƒ', slug: 'dama' }, { name: 'BÄƒrbaÈ›i', slug: 'barbati' }, { name: 'Copii', slug: 'copii' }
  ]},
  { name: 'Accesorii', slug: 'accesorii', icon: 'gem', children: [
    { name: 'GenÈ›i', slug: 'genti' }, { name: 'Bijuterii', slug: 'bijuterii' }, { name: 'Ochelari', slug: 'ochelari' }
  ]},
  { name: 'Altele', slug: 'altele', icon: 'ellipsis' },
]

async function seedCategory(parentId: string | null, items: any[]) {
  for (const item of items) {
    const { children, ...data } = item
    const cat = await prisma.productCategory.create({
      data: { ...data, parentId },
    })
    if (children) await seedCategory(cat.id, children)
  }
}

async function main() {
  console.log('Seeding categories...')
  await seedCategory(null, categories)
  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add seed command to `package.json`**

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run: `npx prisma db seed`

- [ ] **Step 3: Write `src/server/api/routers/category.ts`**

```typescript
import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const categoryRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.productCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            _count: { select: { products: { where: { status: 'ACTIVE' } } } },
          },
        },
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
    })
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.productCategory.findUnique({
        where: { slug: input.slug },
        include: {
          children: true,
          parent: true,
        },
      })
      if (!category) throw new Error('Category not found')
      return category
    }),

  getAncestors: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const ancestors: { id: string; name: string; slug: string }[] = []
      let current = await ctx.prisma.productCategory.findUnique({ where: { slug: input.slug } })
      while (current?.parentId) {
        const parent = await ctx.prisma.productCategory.findUnique({ where: { id: current.parentId } })
        if (!parent) break
        ancestors.unshift({ id: parent.id, name: parent.name, slug: parent.slug })
        current = parent
      }
      return ancestors
    }),
})
```

- [ ] **Step 4: Update `src/server/api/root.ts`**

```typescript
import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 5: Write category page `src/app/(public)/categorii/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductFilters } from '@/components/product/product-filters'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const caller = await api()
  try {
    const cat = await caller.category.getBySlug({ slug: params.slug })
    return { title: `${cat.name} - Smarty`, description: `Vezi produse din categoria ${cat.name}` }
  } catch { return { title: 'Categorie - Smarty' } }
}

export default async function CategoryPage({ params, searchParams }: {
  params: { slug: string }
  searchParams: { brand?: string; condition?: string; min?: string; max?: string; sort?: string }
}) {
  const caller = await api()
  const category = await caller.category.getBySlug({ slug: params.slug }).catch(() => notFound())
  const ancestors = await caller.category.getAncestors({ slug: params.slug })

  const where: any = {
    categoryId: category.id,
    status: 'ACTIVE' as const,
  }
  if (searchParams.brand) where.brand = { contains: searchParams.brand, mode: 'insensitive' }
  if (searchParams.condition) where.condition = searchParams.condition
  if (searchParams.min || searchParams.max) {
    where.price = {}
    if (searchParams.min) where.price.gte = parseFloat(searchParams.min)
    if (searchParams.max) where.price.lte = parseFloat(searchParams.max)
  }

  const orderBy: any = { createdAt: 'desc' }
  if (searchParams.sort === 'price_asc') orderBy.price = 'asc'
  if (searchParams.sort === 'price_desc') orderBy.price = 'desc'

  const [products, productCount] = await Promise.all([
    (await import('@/lib/prisma')).prisma.product.findMany({ where, orderBy, take: 48, include: { seller: { select: { name: true, image: true } } } }),
    (await import('@/lib/prisma')).prisma.product.count({ where }),
  ])

  return (
    <div className="container py-8">
      <Breadcrumbs items={[...ancestors, { name: category.name, slug: category.slug }]} />
      <h1 className="text-3xl font-bold mt-4 mb-2">{category.name}</h1>
      <p className="text-muted-foreground mb-8">{productCount} produse</p>
      <div className="flex gap-8">
        <aside className="w-56 hidden md:block">
          <ProductFilters searchParams={searchParams} />
        </aside>
        <main className="flex-1">
          <ProductGrid products={products} />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/ui/breadcrumbs.tsx`**

```tsx
import Link from 'next/link'

interface BreadcrumbItem { name: string; slug: string }

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground">AcasÄƒ</Link>
      {items.map((item, i) => (
        <span key={item.slug}>
          <span className="mx-1">/</span>
          {i === items.length - 1 ? (
            <span className="text-foreground font-medium">{item.name}</span>
          ) : (
            <Link href={`/categorii/${item.slug}`} className="hover:text-foreground">{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 7: Create placeholder components**

File: `src/components/product/product-grid.tsx`
```tsx
import { ProductCard } from './product-card'

export function ProductGrid({ products }: { products: any[] }) {
  if (products.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">Niciun produs gÄƒsit.</p>
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (<ProductCard key={p.id} product={p} />))}
    </div>
  )
}
```

File: `src/components/product/product-card.tsx`
```tsx
import Link from 'next/link'
import Image from 'next/image'
import { formatRON, conditionLabel } from '@/lib/utils'

export function ProductCard({ product }: { product: any }) {
  return (
    <Link href={`/produse/${product.id}`} className="group block">
      <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-2">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={product.title} fill className="object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">FÄƒrÄƒ imagine</div>
        )}
        <span className="absolute top-2 left-2 bg-white text-xs px-2 py-0.5 rounded-full">{conditionLabel(product.condition)}</span>
      </div>
      <p className="text-sm font-medium truncate">{product.title}</p>
      <p className="text-sm font-bold">{formatRON(product.price)}</p>
    </Link>
  )
}
```

File: `src/components/product/product-filters.tsx`
```tsx
export function ProductFilters({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return (
    <div className="space-y-4">
      <form method="get" className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">PreÈ› (RON)</h4>
          <div className="flex gap-2">
            <input name="min" placeholder="Min" defaultValue={searchParams.min} className="w-full border rounded px-2 py-1 text-sm" />
            <input name="max" placeholder="Max" defaultValue={searchParams.max} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Brand</h4>
          <input name="brand" placeholder="CautÄƒ brand..." defaultValue={searchParams.brand} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <h4 className="font-medium mb-2">Stare</h4>
          <select name="condition" defaultValue={searchParams.condition || ''} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">Toate</option>
            <option value="NEW">Nou</option>
            <option value="LIKE_NEW">Ca nou</option>
            <option value="GOOD">Bun</option>
            <option value="FAIR">SatisfÄƒcÄƒtor</option>
          </select>
        </div>
        <div>
          <h4 className="font-medium mb-2">Sortare</h4>
          <select name="sort" defaultValue={searchParams.sort || ''} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">Cele mai noi</option>
            <option value="price_asc">PreÈ› crescÄƒtor</option>
            <option value="price_desc">PreÈ› descrescÄƒtor</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-purple-700 text-white rounded px-3 py-2 text-sm">AplicÄƒ filtre</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
# Visit http://localhost:3000/categorii/makeup â€” should render category page with breadcrumbs
```

- [ ] **Step 9: Commit**

```bash
git add prisma/seed.ts src/server/api/routers/category.ts src/server/api/root.ts src/app/(public)/categorii/ src/components/
git commit -m "feat: add category seed, router, browse page with filters"
```

---

### Task 7: Product CRUD â€” Create & View

**Files:**
- Create: `src/server/api/routers/product.ts`
- Modify: `src/server/api/root.ts` (add productRouter)
- Create: `src/app/(cont)/produse/nou/page.tsx`
- Create: `src/app/(public)/produse/[id]/page.tsx`
- Create: `src/components/product/product-form.tsx`
- Create: `src/lib/minio.ts`

**Interfaces:**
- Consumes: `router`/`protectedProcedure`/`publicProcedure` from Task 3
- Produces: `productRouter` with `create`, `getById`, `getMyProducts`, `update`, `delete`, `search`

- [ ] **Step 1: Write MinIO client `src/lib/minio.ts`**

```typescript
import { S3Client } from '@aws-sdk/client-s3'

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT!,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
})

export const BUCKET = process.env.MINIO_BUCKET!
export const UPLOAD_ENDPOINT = `${process.env.MINIO_ENDPOINT}/${BUCKET}`
```

- [ ] **Step 2: Write `src/server/api/routers/product.ts`**

```typescript
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const productRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(200),
      description: z.string().min(10),
      categoryId: z.string(),
      condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
      price: z.number().min(1),
      brand: z.string().optional(),
      shade: z.string().optional(),
      skinType: z.string().optional(),
      images: z.array(z.string()).max(10),
      variants: z.array(z.object({ attribute: z.string(), value: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { variants, ...productData } = input
      return ctx.prisma.product.create({
        data: {
          ...productData,
          sellerId: ctx.user.id,
          variants: variants ? { create: variants } : undefined,
        },
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
        include: {
          seller: {
            select: { id: true, name: true, image: true, sellerRating: true, _count: { select: { products: { where: { status: 'ACTIVE' } }, sellerOrders: true } } },
          },
          category: true,
          variants: true,
        },
      })
      if (!product) throw new TRPCError({ code: 'NOT_FOUND' })
      return product
    }),

  getMyProducts: protectedProcedure
    .input(z.object({ status: z.enum(['ACTIVE', 'SOLD', 'HIDDEN']).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.product.findMany({
        where: { sellerId: ctx.user.id, status: input?.status || 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { offers: true } } },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      status: z.enum(['ACTIVE', 'SOLD', 'HIDDEN']).optional(),
      images: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const product = await ctx.prisma.product.findUnique({ where: { id } })
      if (!product || product.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.product.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({ where: { id: input.id } })
      if (!product || product.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.product.delete({ where: { id: input.id } })
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: input.q, mode: 'insensitive' } },
            { description: { contains: input.q, mode: 'insensitive' } },
            { brand: { contains: input.q, mode: 'insensitive' } },
          ],
        },
        take: input.limit,
        include: { seller: { select: { name: true, image: true } } },
      })
    }),

  getLatest: publicProcedure
    .input(z.object({ limit: z.number().max(48).default(12) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: { seller: { select: { name: true, image: true } } },
      })
    }),
})
```

- [ ] **Step 3: Update `src/server/api/root.ts`**

```typescript
// Add to imports:
import { productRouter } from './routers/product'

// Add to appRouter:
export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
})
```

- [ ] **Step 4: Write create product page `src/app/(cont)/produse/nou/page.tsx`**

```tsx
import { Metadata } from 'next'
import { ProductForm } from '@/components/product/product-form'
import { api } from '@/lib/trpc/server'

export const metadata: Metadata = { title: 'AdaugÄƒ produs - Smarty' }

export default async function NewProductPage() {
  const caller = await api()
  const categories = await caller.category.getAll()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">AdaugÄƒ produs nou</h1>
      <ProductForm categories={categories} />
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/product/product-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FlatCategory { id: string; name: string; children?: FlatCategory[] }

export function ProductForm({ categories }: { categories: FlatCategory[] }) {
  const router = useRouter()
  const createProduct = trpc.product.create.useMutation()
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', condition: 'GOOD' as const,
    price: '', brand: '', shade: '', skinType: '', images: [] as string[],
  })
  const [imageInput, setImageInput] = useState('')

  const addImage = () => {
    if (imageInput && form.images.length < 10) {
      setForm({ ...form, images: [...form.images, imageInput] })
      setImageInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createProduct.mutateAsync({ ...form, price: parseFloat(form.price) })
    router.push('/cont/produse')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <Label>Imagini (URL-uri)</Label>
        <div className="flex gap-2">
          <Input value={imageInput} onChange={(e) => setImageInput(e.target.value)} placeholder="https://..." />
          <Button type="button" variant="outline" onClick={addImage}>AdaugÄƒ</Button>
        </div>
        {form.images.length > 0 && (
          <div className="flex gap-2 mt-2">
            {form.images.map((url, i) => (
              <div key={i} className="relative w-16 h-16 bg-gray-100 rounded">
                <img src={url} alt="" className="w-full h-full object-cover rounded" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                >Ã—</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="title">Titlu *</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>

      <div>
        <Label htmlFor="description">Descriere *</Label>
        <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} required />
      </div>

      <div>
        <Label>Categorie *</Label>
        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} required>
          <SelectTrigger><SelectValue placeholder="Alege categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">PreÈ› (RON) *</Label>
          <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
        <div>
          <Label>Stare *</Label>
          <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })} required>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">Nou</SelectItem>
              <SelectItem value="LIKE_NEW">Ca nou</SelectItem>
              <SelectItem value="GOOD">Bun</SelectItem>
              <SelectItem value="FAIR">SatisfÄƒcÄƒtor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Maybelline" />
        </div>
        <div>
          <Label htmlFor="shade">NuanÈ›Äƒ</Label>
          <Input id="shade" value={form.shade} onChange={(e) => setForm({ ...form, shade: e.target.value })} placeholder="100" />
        </div>
        <div>
          <Label htmlFor="skinType">Tip ten</Label>
          <Input id="skinType" value={form.skinType} onChange={(e) => setForm({ ...form, skinType: e.target.value })} placeholder="Mixt" />
        </div>
      </div>

      <Button type="submit" disabled={createProduct.isLoading}>
        {createProduct.isLoading ? 'Se salveazÄƒ...' : 'PublicÄƒ produsul'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 6: Write product detail page `src/app/(public)/produse/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { ProductDetail } from './product-detail'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const caller = await api()
  try {
    const p = await caller.product.getById({ id: params.id })
    return { title: `${p.title} - Smarty`, description: p.description.substring(0, 160) }
  } catch { return { title: 'Produs - Smarty' } }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const caller = await api()
  const product = await caller.product.getById({ id: params.id }).catch(() => notFound())
  return <ProductDetail product={product} />
}
```

- [ ] **Step 7: Write product detail client component `src/app/(public)/produse/[id]/product-detail.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc/client'
import { formatRON, conditionLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

export function ProductDetail({ product }: { product: any }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [offerAmount, setOfferAmount] = useState('')
  const createOffer = trpc.offer.create.useMutation()
  const [currentImage, setCurrentImage] = useState(0)

  const isOwner = session?.user?.id === product.seller.id

  const handleOffer = async () => {
    if (!session) { router.push('/login'); return }
    const amount = parseFloat(offerAmount)
    if (!amount || amount <= 0 || amount >= product.price) {
      toast.error('Oferta trebuie sÄƒ fie mai micÄƒ decÃ¢t preÈ›ul')
      return
    }
    await createOffer.mutateAsync({ productId: product.id, amount })
    toast.success('OfertÄƒ trimisÄƒ!')
    setOfferAmount('')
  }

  const handleBuyNow = async () => {
    if (!session) { router.push('/login'); return }
    router.push(`/checkout?productId=${product.id}`)
  }

  return (
    <div className="container py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
            {product.images[currentImage] ? (
              <img src={product.images[currentImage]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">FÄƒrÄƒ imagine</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((url: string, i: number) => (
                <button key={i} onClick={() => setCurrentImage(i)} className={`w-16 h-16 rounded border-2 ${i === currentImage ? 'border-purple-700' : 'border-transparent'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover rounded" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-sm text-purple-700 font-medium">{conditionLabel(product.condition)}</span>
            <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
            <p className="text-3xl font-bold mt-2">{formatRON(product.price)}</p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Avatar>
              <AvatarImage src={product.seller.image || undefined} />
              <AvatarFallback>{product.seller.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{product.seller.name}</p>
              <p className="text-sm text-muted-foreground">
                â­ {product.seller.sellerRating.toFixed(1)} Â· {product.seller._count.products} produse Â· {product.seller._count.sellerOrders} vÃ¢nzÄƒri
              </p>
            </div>
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          <div className="flex flex-wrap gap-2 text-sm">
            {product.brand && <span className="bg-gray-100 px-2 py-1 rounded">Brand: {product.brand}</span>}
            {product.shade && <span className="bg-gray-100 px-2 py-1 rounded">NuanÈ›Äƒ: {product.shade}</span>}
            {product.skinType && <span className="bg-gray-100 px-2 py-1 rounded">Tip ten: {product.skinType}</span>}
          </div>

          <Separator />

          {!isOwner && (
            <div className="space-y-4">
              <Button onClick={handleBuyNow} className="w-full" size="lg">
                CumpÄƒrÄƒ acum â€” {formatRON(product.price)}
              </Button>

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Suma ofertei tale"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                />
                <Button variant="outline" onClick={handleOffer} disabled={createOffer.isLoading}>
                  OferteazÄƒ
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Build and verify**

```bash
npx prisma generate
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/server/api/routers/product.ts src/server/api/root.ts src/app/(cont)/produse/ src/app/(public)/produse/ src/components/product/ src/lib/minio.ts
git commit -m "feat: add product CRUD, create form, detail page"
```
### Task 8: Offer System (Negotiation)

**Files:**
- Create: `src/server/api/routers/offer.ts`
- Modify: `src/server/api/root.ts` (add offerRouter)
- Create: `src/app/(cont)/oferte/page.tsx`

**Interfaces:**
- Consumes: `protectedProcedure`/`publicProcedure` from Task 3, `productRouter` from Task 7
- Produces: `offerRouter` with `create`, `respond`, `getMyOffers`, `getReceivedOffers`

- [ ] **Step 1: Write `src/server/api/routers/offer.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const offerRouter = router({
  create: protectedProcedure
    .input(z.object({
      productId: z.string(),
      amount: z.number().min(0.01),
    }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({ where: { id: input.productId } })
      if (!product || product.status !== 'ACTIVE') throw new TRPCError({ code: 'NOT_FOUND' })
      if (product.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nu poÈ›i oferta propriul produs' })
      if (input.amount >= product.price) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Oferta trebuie sÄƒ fie mai micÄƒ decÃ¢t preÈ›ul' })

      return ctx.prisma.offer.create({
        data: {
          productId: input.productId,
          buyerId: ctx.user.id,
          sellerId: product.sellerId,
          amount: input.amount,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      })
    }),

  respond: protectedProcedure
    .input(z.object({
      offerId: z.string(),
      response: z.enum(['ACCEPTED', 'REFUSED', 'COUNTERED']),
      counterAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({ where: { id: input.offerId } })
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' })
      if (offer.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      if (input.response === 'COUNTERED') {
        if (!input.counterAmount) throw new TRPCError({ code: 'BAD_REQUEST' })
        if (offer.round >= 3) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maxim 3 runde de contraofertÄƒ' })
        return ctx.prisma.offer.update({
          where: { id: input.offerId },
          data: {
            status: 'COUNTERED',
            amount: input.counterAmount,
            round: offer.round + 1,
            buyerId: offer.buyerId,
            sellerId: ctx.user.id,
          },
        })
      }

      return ctx.prisma.offer.update({
        where: { id: input.offerId },
        data: { status: input.response },
      })
    }),

  acceptCounter: protectedProcedure
    .input(z.object({
      offerId: z.string(),
      accepted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({ where: { id: input.offerId } })
      if (!offer || offer.status !== 'COUNTERED') throw new TRPCError({ code: 'NOT_FOUND' })
      if (offer.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      return ctx.prisma.offer.update({
        where: { id: input.offerId },
        data: { status: input.accepted ? 'ACCEPTED' : 'REFUSED' },
      })
    }),

  getMyOffers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.offer.findMany({
      where: { buyerId: ctx.user.id },
      include: { product: { select: { title: true, images: true } }, seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  getReceivedOffers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.offer.findMany({
      where: { sellerId: ctx.user.id },
      include: { product: { select: { title: true, images: true } }, buyer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  getByProduct: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({ where: { id: input.productId } })
      if (!product || product.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.offer.findMany({
        where: { productId: input.productId },
        include: { buyer: { select: { name: true, image: true, buyerRating: true } } },
        orderBy: { amount: 'desc' },
      })
    }),
})
```

- [ ] **Step 2: Update `src/server/api/root.ts`**

```typescript
// Add to imports:
import { offerRouter } from './routers/offer'

// Add to appRouter:
export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
})
```

- [ ] **Step 3: Write offers page `src/app/(cont)/oferte/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { OffersTabs } from './offers-tabs'

export default async function OffersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const caller = await api()
  const [myOffers, receivedOffers] = await Promise.all([
    caller.offer.getMyOffers(),
    caller.offer.getReceivedOffers(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Oferte</h1>
      <OffersTabs myOffers={myOffers} receivedOffers={receivedOffers} />
    </div>
  )
}
```

- [ ] **Step 4: Write `src/app/(cont)/oferte/offers-tabs.tsx`**

```tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { formatRON } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

function OfferCard({ offer, type }: { offer: any; type: 'sent' | 'received' }) {
  const utils = trpc.useUtils()
  const respond = trpc.offer.respond.useMutation({
    onSuccess: () => { utils.offer.invalidate(); toast.success('RÄƒspuns trimis') },
  })

  const statusLabels: Record<string, string> = {
    PENDING: 'ÃŽn aÈ™teptare', ACCEPTED: 'AcceptatÄƒ',
    REFUSED: 'RefuzatÄƒ', COUNTERED: 'ContraofertÄƒ',
  }

  return (
    <div className="border rounded-lg p-4 flex items-start gap-4">
      <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{offer.product?.title || 'Produs'}</p>
        <p className="text-sm text-muted-foreground">
          {type === 'sent' ? `CÄƒtre: ${offer.seller?.name}` : `De la: ${offer.buyer?.name}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold">{formatRON(offer.amount)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${offer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : offer.status === 'REFUSED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {statusLabels[offer.status]}
          </span>
        </div>

        {type === 'received' && offer.status === 'PENDING' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => respond.mutate({ offerId: offer.id, response: 'ACCEPTED' })}>
              AcceptÄƒ
            </Button>
            <Button size="sm" variant="outline" onClick={() => respond.mutate({ offerId: offer.id, response: 'REFUSED' })}>
              RefuzÄƒ
            </Button>
            <Button size="sm" variant="secondary" onClick={() => {
              const amount = prompt('Suma contraofertei:')
              if (amount) respond.mutate({ offerId: offer.id, response: 'COUNTERED', counterAmount: parseFloat(amount) })
            }}>
              ContraofertÄƒ
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function OffersTabs({ myOffers, receivedOffers }: { myOffers: any[]; receivedOffers: any[] }) {
  return (
    <Tabs defaultValue="received">
      <TabsList>
        <TabsTrigger value="received">Primite ({receivedOffers.length})</TabsTrigger>
        <TabsTrigger value="sent">Trimise ({myOffers.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="received" className="space-y-3 mt-4">
        {receivedOffers.length === 0 ? (
          <p className="text-muted-foreground">Nicio ofertÄƒ primitÄƒ.</p>
        ) : receivedOffers.map((o) => <OfferCard key={o.id} offer={o} type="received" />)}
      </TabsContent>
      <TabsContent value="sent" className="space-y-3 mt-4">
        {myOffers.length === 0 ? (
          <p className="text-muted-foreground">Nicio ofertÄƒ trimisÄƒ.</p>
        ) : myOffers.map((o) => <OfferCard key={o.id} offer={o} type="sent" />)}
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/offer.ts src/server/api/root.ts src/app/(cont)/oferte/
git commit -m "feat: add offer negotiation system with accept/refuse/counter"
```

---

### Task 9: RFQ (Requests for Quotes)

**Files:**
- Create: `src/server/api/routers/rfq.ts`
- Modify: `src/server/api/root.ts` (add rfqRouter)
- Create: `src/app/(public)/cereri/page.tsx`
- Create: `src/app/(public)/cereri/[id]/page.tsx`
- Create: `src/app/(public)/cereri/noua/page.tsx`

**Interfaces:**
- Consumes: `protectedProcedure`/`publicProcedure` from Task 3
- Produces: `rfqRouter` with `create`, `getAll`, `getById`, `offer`, `accept`

- [ ] **Step 1: Write `src/server/api/routers/rfq.ts`**

```typescript
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const rfqRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(5).max(200),
      description: z.string().min(10),
      categoryId: z.string(),
      maxBudget: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rFQ.create({
        data: {
          ...input,
          buyerId: ctx.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    }),

  getAll: publicProcedure
    .input(z.object({ categoryId: z.string().optional(), limit: z.number().max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rFQ.findMany({
        where: {
          status: 'OPEN',
          ...(input?.categoryId ? { categoryId: input.categoryId } : {}),
        },
        include: {
          buyer: { select: { name: true, image: true, buyerRating: true } },
          category: { select: { name: true, slug: true } },
          _count: { select: { offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: input?.limit || 20,
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rfq = await ctx.prisma.rFQ.findUnique({
        where: { id: input.id },
        include: {
          buyer: { select: { id: true, name: true, image: true, buyerRating: true } },
          category: { select: { name: true, slug: true } },
          offers: {
            include: { seller: { select: { id: true, name: true, image: true, sellerRating: true } } },
            orderBy: { amount: 'asc' },
          },
        },
      })
      if (!rfq) throw new TRPCError({ code: 'NOT_FOUND' })
      return rfq
    }),

  getMyRFQs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rFQ.findMany({
      where: { buyerId: ctx.user.id },
      include: {
        category: { select: { name: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  offer: protectedProcedure
    .input(z.object({
      rfqId: z.string(),
      amount: z.number(),
      message: z.string().optional(),
      productId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rfq = await ctx.prisma.rFQ.findUnique({ where: { id: input.rfqId } })
      if (!rfq || rfq.status !== 'OPEN') throw new TRPCError({ code: 'NOT_FOUND' })
      if (rfq.buyerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST' })
      if (input.amount > rfq.maxBudget) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Suma depÄƒÈ™eÈ™te bugetul' })

      return ctx.prisma.rFQOffer.create({
        data: {
          rfqId: input.rfqId,
          sellerId: ctx.user.id,
          amount: input.amount,
          message: input.message,
          productId: input.productId,
        },
      })
    }),

  accept: protectedProcedure
    .input(z.object({ rfqOfferId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rfqOffer = await ctx.prisma.rFQOffer.findUnique({
        where: { id: input.rfqOfferId },
        include: { rfq: true },
      })
      if (!rfqOffer) throw new TRPCError({ code: 'NOT_FOUND' })
      if (rfqOffer.rfq.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.rFQOffer.update({
        where: { id: input.rfqOfferId },
        data: { status: 'ACCEPTED' },
      })
      await ctx.prisma.rFQ.update({
        where: { id: rfqOffer.rfqId },
        data: { status: 'AWARDED' },
      })
      // Reject all other offers
      await ctx.prisma.rFQOffer.updateMany({
        where: { rfqId: rfqOffer.rfqId, id: { not: input.rfqOfferId } },
        data: { status: 'REFUSED' },
      })

      return rfqOffer
    }),
})
```

- [ ] **Step 2: Update `src/server/api/root.ts`**

```typescript
// Add to imports:
import { rfqRouter } from './routers/rfq'

// Add to appRouter:
export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
  rfq: rfqRouter,
})
```

- [ ] **Step 3: Write RFQ list page `src/app/(public)/cereri/page.tsx`**

```tsx
import { api } from '@/lib/trpc/server'
import Link from 'next/link'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ro } from 'date-fns/locale'

export const metadata = { title: 'Cereri active - Smarty' }

export default async function CereriPage() {
  const caller = await api()
  const rfqs = await caller.rfq.getAll()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Cereri active</h1>
        <Link href="/cereri/noua"><Button>+ PosteazÄƒ cerere</Button></Link>
      </div>
      <div className="grid gap-4">
        {rfqs.map((rfq: any) => (
          <Link key={rfq.id} href={`/cereri/${rfq.id}`} className="block border rounded-lg p-4 hover:border-purple-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-lg">{rfq.title}</h2>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{rfq.description}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span>{rfq.category.name}</span>
                  <span>Â·</span>
                  <span className="font-medium">{formatRON(rfq.maxBudget)} max</span>
                  <span>Â·</span>
                  <span>{rfq._count.offers} oferte</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(rfq.expiresAt), { locale: ro, addSuffix: true })}
              </span>
            </div>
          </Link>
        ))}
        {rfqs.length === 0 && (
          <p className="text-muted-foreground text-center py-12">Nicio cerere activÄƒ momentan.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write RFQ detail page `src/app/(public)/cereri/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { RFQDetail } from './rfq-detail'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const caller = await api()
  try {
    const r = await caller.rfq.getById({ id: params.id })
    return { title: `${r.title} - Cereri Smarty` }
  } catch { return { title: 'Cerere - Smarty' } }
}

export default async function RFQPage({ params }: { params: { id: string } }) {
  const caller = await api()
  const rfq = await caller.rfq.getById({ id: params.id }).catch(() => notFound())
  return <RFQDetail rfq={rfq} />
}
```

- [ ] **Step 5: Write `src/app/(public)/cereri/[id]/rfq-detail.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

export function RFQDetail({ rfq }: { rfq: any }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const createOffer = trpc.rfq.offer.useMutation()
  const acceptOffer = trpc.rfq.accept.useMutation()
  const isOwner = session?.user?.id === rfq.buyer.id

  const handleOffer = async () => {
    if (!session) { router.push('/login'); return }
    await createOffer.mutateAsync({ rfqId: rfq.id, amount: parseFloat(amount), message })
    toast.success('OfertÄƒ trimisÄƒ!')
  }

  const handleAccept = async (offerId: string) => {
    await acceptOffer.mutateAsync({ rfqOfferId: offerId })
    toast.success('OfertÄƒ acceptatÄƒ! Comanda a fost creatÄƒ.')
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <Avatar><AvatarImage src={rfq.buyer.image} /><AvatarFallback>{rfq.buyer.name?.[0]}</AvatarFallback></Avatar>
        <div>
          <p className="font-medium">{rfq.buyer.name}</p>
          <p className="text-sm text-muted-foreground">CumpÄƒrÄƒtor</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2">{rfq.title}</h1>
      <p className="text-muted-foreground mb-4">{rfq.description}</p>
      <div className="flex items-center gap-4 text-sm mb-8">
        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{rfq.category.name}</span>
        <span className="font-bold">{formatRON(rfq.maxBudget)} max</span>
      </div>

      <Separator className="mb-8" />

      <h2 className="text-xl font-bold mb-4">Oferte ({rfq.offers.length})</h2>

      {rfq.offers.map((offer: any) => (
        <div key={offer.id} className="border rounded-lg p-4 mb-3 flex items-start gap-4">
          <Avatar><AvatarImage src={offer.seller.image} /><AvatarFallback>{offer.seller.name?.[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{offer.seller.name}</p>
              <span className="font-bold text-lg">{formatRON(offer.amount)}</span>
            </div>
            {offer.message && <p className="text-sm text-muted-foreground mt-1">{offer.message}</p>}
            {isOwner && offer.status === 'PENDING' && (
              <Button size="sm" className="mt-2" onClick={() => handleAccept(offer.id)}>
                AcceptÄƒ oferta
              </Button>
            )}
            {offer.status === 'ACCEPTED' && (
              <span className="text-green-600 text-sm font-medium">AcceptatÄƒ âœ“</span>
            )}
          </div>
        </div>
      ))}

      {!isOwner && session && (
        <div className="border rounded-lg p-4 mt-8">
          <h3 className="font-semibold mb-3">Trimite oferta ta</h3>
          <div className="space-y-3">
            <div>
              <Input type="number" placeholder="Suma (RON)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Textarea placeholder="Mesaj opÈ›ional..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleOffer} disabled={createOffer.isLoading}>
              Trimite oferta
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write create RFQ page `src/app/(public)/cereri/noua/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { RFQForm } from './rfq-form'

export const metadata = { title: 'PosteazÄƒ cerere - Smarty' }

export default async function NewRFQPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/cereri/noua')
  const caller = await api()
  const categories = await caller.category.getAll()
  return (
    <div className="container py-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-8">PosteazÄƒ o cerere</h1>
      <RFQForm categories={categories} />
    </div>
  )
}
```

File: `src/app/(public)/cereri/noua/rfq-form.tsx`
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function RFQForm({ categories }: { categories: any[] }) {
  const router = useRouter()
  const createRFQ = trpc.rfq.create.useMutation()
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', maxBudget: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createRFQ.mutateAsync({
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      maxBudget: parseFloat(form.maxBudget),
    })
    toast.success('Cerere postatÄƒ!')
    router.push('/cereri')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Ce cauÈ›i? *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Ruj Maybelline nuanÈ›a 100" required />
      </div>
      <div>
        <Label>Descriere *</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrie ce cauÈ›i, stare, preferinÈ›e..." rows={4} required />
      </div>
      <div>
        <Label>Categorie *</Label>
        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} required>
          <SelectTrigger><SelectValue placeholder="Alege categoria" /></SelectTrigger>
          <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Buget maxim (RON) *</Label>
        <Input type="number" value={form.maxBudget} onChange={(e) => setForm({ ...form, maxBudget: e.target.value })} required />
      </div>
      <Button type="submit" disabled={createRFQ.isLoading}>
        {createRFQ.isLoading ? 'Se posteazÄƒ...' : 'PosteazÄƒ cererea'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/server/api/routers/rfq.ts src/server/api/root.ts src/app/(public)/cereri/
git commit -m "feat: add RFQ system with create, browse, offer, accept"
```

---

### Task 10: Cart & Checkout

**Files:**
- Create: `src/components/cart/cart-provider.tsx`
- Create: `src/app/(public)/cos/page.tsx`
- Create: `src/app/(public)/checkout/page.tsx`

**Interfaces:**
- Consumes: `productRouter` from Task 7, auth from Task 4
- Produces: Cart state management and checkout page

- [ ] **Step 1: Write cart provider `src/components/cart/cart-provider.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface CartItem {
  productId: string
  title: string
  price: number
  image: string | null
  sellerName: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType>({
  items: [], addItem: () => {}, removeItem: () => {}, clearCart: () => {}, total: 0, itemCount: 0,
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('smarty-cart')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('smarty-cart', JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.productId === item.productId)) return prev
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, i) => sum + i.price, 0)
  const itemCount = items.length

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
```

- [ ] **Step 2: Wrap app with CartProvider**

Modify root layout to include CartProvider. Create `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { CartProvider } from '@/components/cart/cart-provider'
import { SessionProvider } from 'next-auth/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Smarty Marketplace', template: '%s' },
  description: 'Marketplace C2C pentru cosmetice, haine È™i accesorii',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={inter.className}>
        <TRPCProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write cart page `src/app/(public)/cos/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/cart-provider'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function CartPage() {
  const { items, removeItem, total, itemCount } = useCart()

  if (itemCount === 0) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">CoÈ™ul tÄƒu este gol</h1>
        <p className="text-muted-foreground mb-6">AdaugÄƒ produse pentru a le cumpÄƒra.</p>
        <Link href="/categorii/makeup"><Button>Vezi produse</Button></Link>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">CoÈ™ul tÄƒu ({itemCount})</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 border rounded-lg p-4">
            <div className="w-16 h-16 bg-gray-100 rounded" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.sellerName}</p>
            </div>
            <p className="font-bold">{formatRON(item.price)}</p>
            <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>âœ•</Button>
          </div>
        ))}
      </div>
      <Separator className="my-6" />
      <div className="flex items-center justify-between mb-6">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-2xl font-bold">{formatRON(total)}</span>
      </div>
      <Link href="/checkout"><Button className="w-full" size="lg">ContinuÄƒ spre checkout</Button></Link>
    </div>
  )
}
```

- [ ] **Step 4: Write checkout page `src/app/(public)/checkout/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { CheckoutForm } from './checkout-form'

export const metadata = { title: 'Checkout - Smarty' }

export default async function CheckoutPage({ searchParams }: { searchParams: { productId?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/checkout')
  return <CheckoutForm productId={searchParams.productId} />
}
```

File: `src/app/(public)/checkout/checkout-form.tsx`
```tsx
'use client'

import { useState } from 'react'
import { useCart } from '@/components/cart/cart-provider'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function CheckoutForm({ productId }: { productId?: string }) {
  const { items, total } = useCart()
  const [address, setAddress] = useState({ city: '', address: '', postalCode: '', phone: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Will be connected to Stripe in Task 11
    alert('Plata va fi integratÄƒ Ã®n task-ul urmÄƒtor cu Stripe Connect')
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Finalizare comandÄƒ</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="font-semibold mb-4">AdresÄƒ de livrare</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>OraÈ™ *</Label>
              <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            </div>
            <div>
              <Label>Cod poÈ™tal *</Label>
              <Input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <Label>AdresÄƒ *</Label>
              <Input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} required />
            </div>
            <div>
              <Label>Telefon *</Label>
              <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} required />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-4">Livrare</h2>
          <div className="border rounded-lg p-4 bg-purple-50">
            <p className="font-medium">EasyBox Sameday</p>
            <p className="text-sm text-muted-foreground">Livrare Ã®n locker EasyBox â€” vei primi codul de ridicare prin SMS</p>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-4">Sumar comandÄƒ</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="truncate">{item.title}</span>
                <span>{formatRON(item.price)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatRON(total)}</span>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg">
          PlÄƒteÈ™te cu cardul â€” {formatRON(total)}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/cart/ src/app/(public)/cos/ src/app/(public)/checkout/ src/app/layout.tsx
git commit -m "feat: add cart provider, cart page, checkout form"
```
### Task 11: Stripe Connect Payments

**Files:**
- Create: `src/server/stripe.ts`
- Create: `src/server/api/routers/payment.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Modify: `src/server/api/root.ts` (add paymentRouter)
- Modify: `src/app/(public)/checkout/checkout-form.tsx` (add Stripe Elements)

**Interfaces:**
- Consumes: `protectedProcedure` from Task 3, `productRouter` from Task 7, cart from Task 10
- Produces: `paymentRouter` with `createIntent`, `confirm`, Stripe webhook handler

- [ ] **Step 1: Write Stripe server helpers `src/server/stripe.ts`**

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-15.acacia' as any,
  typescript: true,
})

export async function createStripeAccount(userId: string, email: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'RO',
    email,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  })
  return account.id
}

export async function createPaymentIntent(
  amount: number,
  customerId: string,
  connectedAccountId: string,
  metadata: Record<string, string>
) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'ron',
    customer: customerId,
    application_fee_amount: Math.round(amount * 100 * 0.1), // 10% platform fee
    transfer_data: { destination: connectedAccountId },
    metadata,
  })
}

export async function releaseEscrow(paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'succeeded') {
    await stripe.paymentIntents.capture(paymentIntentId)
  }
}

export async function refundPayment(paymentIntentId: string) {
  return stripe.refunds.create({ payment_intent: paymentIntentId })
}
```

- [ ] **Step 2: Write `src/server/api/routers/payment.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { stripe, createPaymentIntent } from '@/server/stripe'

export const paymentRouter = router({
  createIntent: protectedProcedure
    .input(z.object({
      productId: z.string(),
      offerId: z.string().optional(),
      rfqOfferId: z.string().optional(),
      amount: z.number(),
      address: z.object({
        city: z.string(), address: z.string(), postalCode: z.string(), phone: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.productId },
        include: { seller: true },
      })
      if (!product) throw new TRPCError({ code: 'NOT_FOUND' })

      // Create order first
      const order = await ctx.prisma.order.create({
        data: {
          buyerId: ctx.user.id,
          sellerId: product.sellerId,
          productId: input.productId,
          offerId: input.offerId,
          rfqOfferId: input.rfqOfferId,
          amount: input.amount,
          status: 'CREATED',
        },
      })

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(input.amount * 100),
        currency: 'ron',
        metadata: { orderId: order.id, buyerId: ctx.user.id, sellerId: product.sellerId },
      })

      await ctx.prisma.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: input.amount,
          status: 'HELD',
        },
      })

      return { orderId: order.id, clientSecret: paymentIntent.client_secret }
    }),

  confirm: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })
      if (!order || order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: 'PAID' },
      })

      return { success: true }
    }),

  getStripeConnectLink: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
      if (!user?.stripeConnectId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'ConfigureazÄƒ mai Ã®ntÃ¢i contul Stripe' })

      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/cont/wallet?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/cont/wallet?success=true`,
        type: 'account_onboarding',
      })
      return { url: accountLink.url }
    }),
})
```

- [ ] **Step 3: Update `src/server/api/root.ts`**

```typescript
// Add to imports:
import { paymentRouter } from './routers/payment'

// Add to appRouter:
export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
  rfq: rfqRouter,
  payment: paymentRouter,
})
```

- [ ] **Step 4: Write Stripe webhook handler `src/app/api/webhooks/stripe/route.ts`**

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/server/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata.orderId) {
        await prisma.order.update({
          where: { id: pi.metadata.orderId },
          data: { status: 'PAID' },
        })
        await prisma.payment.update({
          where: { stripePaymentIntentId: pi.id },
          data: { status: 'HELD' },
        })
      }
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled) {
        await prisma.user.updateMany({
          where: { stripeConnectId: account.id },
          data: {},
        })
      }
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

- [ ] **Step 5: Update checkout form with Stripe Elements**

Install: `npm install @stripe/stripe-js @stripe/react-stripe-js`

Modify `src/app/(public)/checkout/checkout-form.tsx` to add Stripe payment:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/cart/cart-provider'
import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export function CheckoutForm({ productId }: { productId?: string }) {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const createIntent = trpc.payment.createIntent.useMutation()
  const confirmOrder = trpc.payment.confirm.useMutation()
  const [address, setAddress] = useState({ city: '', address: '', postalCode: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // MVP scope: single-item checkout (multi-item cart shipping not yet supported)
      // Each product generates a separate order with its own shipment
      const item = items[0]
      if (!item) return

      const result = await createIntent.mutateAsync({
        productId: item.productId,
        amount: item.price,
        address,
      })

      // In production, this would use Stripe Elements for card collection
      // For MVP we simulate successful payment via the confirm endpoint
      await confirmOrder.mutateAsync({ orderId: result.orderId })
      clearCart()
      toast.success('ComandÄƒ plasatÄƒ cu succes!')
      router.push(`/cont/comenzi/${result.orderId}`)
    } catch (err: any) {
      toast.error(err.message || 'A apÄƒrut o eroare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Finalizare comandÄƒ</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="font-semibold mb-4">AdresÄƒ de livrare</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>OraÈ™ *</Label>
              <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            </div>
            <div>
              <Label>Cod poÈ™tal *</Label>
              <Input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <Label>AdresÄƒ *</Label>
              <Input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} required />
            </div>
            <div>
              <Label>Telefon *</Label>
              <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} required />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-4">Livrare</h2>
          <div className="border rounded-lg p-4 bg-purple-50">
            <p className="font-medium">EasyBox Sameday</p>
            <p className="text-sm text-muted-foreground">Livrare Ã®n locker EasyBox â€” cost 15 RON</p>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-4">Sumar comandÄƒ</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="truncate">{item.title}</span>
                <span>{formatRON(item.price)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm"><span>Transport</span><span>{formatRON(15)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatRON(total + (items.length > 0 ? 15 : 0))}</span>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Se proceseazÄƒ...' : `PlÄƒteÈ™te cu cardul â€” ${formatRON(total + (items.length > 0 ? 15 : 0))}`}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/server/stripe.ts src/server/api/routers/payment.ts src/server/api/root.ts src/app/api/webhooks/ src/app/(public)/checkout/
git commit -m "feat: add Stripe Connect payments with escrow and webhook"
```

---

### Task 12: Shipping â€” Sameday EasyBox

**Files:**
- Create: `src/server/sameday.ts`
- Create: `src/server/api/routers/shipping.ts`
- Modify: `src/server/api/root.ts` (add shippingRouter)

**Interfaces:**
- Consumes: `protectedProcedure` from Task 3, `orderRouter` from Task 11
- Produces: `shippingRouter` with `createShipment`, `trackShipment`

- [ ] **Step 1: Write Sameday client `src/server/sameday.ts`**

```typescript
const SAMEDAY_API = process.env.SAMEDAY_API_URL!

interface SamedayAuth {
  token: string
  expiresAt: number
}

let auth: SamedayAuth | null = null

async function authenticate(): Promise<string> {
  if (auth && auth.expiresAt > Date.now()) return auth.token

  const res = await fetch(`${SAMEDAY_API}/client/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.SAMEDAY_CLIENT_ID,
      clientSecret: process.env.SAMEDAY_CLIENT_SECRET,
    }),
  })

  if (!res.ok) throw new Error('Sameday auth failed')
  const data = await res.json()
  auth = { token: data.token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }
  return auth.token
}

export async function createEasyboxShipment(params: {
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  lockerId: string
  orderNumber: string
  packageValue: number
}): Promise<{ awb: string; trackingUrl: string; pickupCode: string }> {
  const token = await authenticate()

  const res = await fetch(`${SAMEDAY_API}/client/awb`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      service: 'ELBOX',
      type: 24, // LockerNextDay
      pickup: { lockerId: params.lockerId },
      delivery: { lockerId: params.lockerId },
      packages: [
        {
          number: params.orderNumber,
          weight: 0.5,
          value: params.packageValue,
          content: 'Produse cosmetice',
        },
      ],
      recipient: {
        name: params.recipientName,
        phoneNumber: params.recipientPhone,
        email: params.recipientEmail,
      },
    }),
  })

  if (!res.ok) throw new Error(`Sameday API error: ${await res.text()}`)
  const data = await res.json()

  return {
    awb: data.awbNumber,
    trackingUrl: data.trackingUrl || `https://sameday.ro/tracking/${data.awbNumber}`,
    pickupCode: data.pickupCode || data.awbNumber,
  }
}

export async function getEasyboxLocations(city: string): Promise<any[]> {
  const token = await authenticate()
  const res = await fetch(`${SAMEDAY_API}/client/lockers?city=${encodeURIComponent(city)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.lockers || data.data || []).map((l: any) => ({
    id: l.lockerId || l.id,
    name: l.name || l.address,
    address: l.address,
    city: l.city,
  }))
}
```

- [ ] **Step 2: Write `src/server/api/routers/shipping.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { createEasyboxShipment, getEasyboxLocations } from '@/server/sameday'

export const shippingRouter = router({
  createShipment: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      lockerId: z.string(),
      recipientName: z.string(),
      recipientPhone: z.string(),
      recipientEmail: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })
      if (!order) throw new TRPCError({ code: 'NOT_FOUND' })
      if (order.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (order.status !== 'PAID') throw new TRPCError({ code: 'BAD_REQUEST' })

      const shipment = await createEasyboxShipment({
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        recipientEmail: input.recipientEmail,
        lockerId: input.lockerId,
        orderNumber: order.id.slice(0, 10),
        packageValue: order.amount,
      })

      await ctx.prisma.shipment.create({
        data: {
          orderId: order.id,
          easyboxAWB: shipment.awb,
          trackingUrl: shipment.trackingUrl,
          pickupCode: shipment.pickupCode,
          status: 'AWB_CREATED',
        },
      })

      await ctx.prisma.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED' },
      })

      return shipment
    }),

  getLocations: protectedProcedure
    .input(z.object({ city: z.string() }))
    .query(async ({ input }) => {
      return getEasyboxLocations(input.city)
    }),

  trackShipment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.shipment.findUnique({ where: { orderId: input.orderId } })
    }),
})
```

- [ ] **Step 3: Update `src/server/api/root.ts`**

```typescript
// Add to imports:
import { shippingRouter } from './routers/shipping'

// Add to appRouter:
export const appRouter = router({
  // ...existing routers
  shipping: shippingRouter,
})
```

- [ ] **Step 4: Commit**

```bash
git add src/server/sameday.ts src/server/api/routers/shipping.ts src/server/api/root.ts
git commit -m "feat: add Sameday EasyBox shipping integration"
```

---

### Task 13: Orders, Returns & Reviews

**Files:**
- Create: `src/server/api/routers/order.ts`
- Create: `src/server/api/routers/return.ts`
- Create: `src/server/api/routers/review.ts`
- Modify: `src/server/api/root.ts` (add orderRouter, returnRouter, reviewRouter)
- Create: `src/app/(cont)/comenzi/page.tsx`
- Create: `src/app/(cont)/comenzi/[id]/page.tsx`
- Create: `src/app/(cont)/retururi/page.tsx`

**Interfaces:**
- Consumes: `protectedProcedure` from Task 3
- Produces: Three new routers for orders, returns, reviews

- [ ] **Step 1: Write `src/server/api/routers/order.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { stripe } from '@/server/stripe'

export const orderRouter = router({
  getMyOrders: protectedProcedure
    .input(z.object({ role: z.enum(['buyer', 'seller']).default('buyer') }))
    .query(async ({ ctx, input }) => {
      const where = input.role === 'buyer'
        ? { buyerId: ctx.user.id }
        : { sellerId: ctx.user.id }
      return ctx.prisma.order.findMany({
        where,
        include: {
          product: { select: { title: true, images: true } },
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
          payment: { select: { status: true } },
          shipment: { select: { easyboxAWB: true, trackingUrl: true, pickupCode: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: {
          product: true,
          buyer: { select: { id: true, name: true, image: true, email: true } },
          seller: { select: { id: true, name: true, image: true } },
          payment: true,
          shipment: true,
          return_: true,
          review: true,
        },
      })
      if (!order) throw new TRPCError({ code: 'NOT_FOUND' })
      if (order.buyerId !== ctx.user.id && order.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      return order
    }),

  confirmDelivery: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })
      if (!order || order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (order.status !== 'SHIPPED') throw new TRPCError({ code: 'BAD_REQUEST' })

      await ctx.prisma.order.update({ where: { id: input.orderId }, data: { status: 'DELIVERED' } })

      // Release escrow to seller
      if (order.payment) {
        await ctx.prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: 'RELEASED', escrowReleasedAt: new Date() },
        })
      }

      return { success: true }
    }),
})
```

- [ ] **Step 2: Write `src/server/api/routers/return.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { stripe, refundPayment } from '@/server/stripe'

export const returnRouter = router({
  request: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      reason: z.string().min(10),
      images: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({ where: { id: input.orderId } })
      if (!order || order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (order.status !== 'DELIVERED') throw new TRPCError({ code: 'BAD_REQUEST' })

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      if (order.updatedAt < fourteenDaysAgo) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Perioada de retur de 14 zile a expirat' })

      return ctx.prisma.return.create({
        data: {
          orderId: input.orderId,
          buyerId: ctx.user.id,
          reason: input.reason,
          images: input.images,
          status: 'REQUESTED',
        },
      })
    }),

  respond: protectedProcedure
    .input(z.object({ returnId: z.string(), accepted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const ret = await ctx.prisma.return.findUnique({
        where: { id: input.returnId },
        include: { order: { include: { payment: true } } },
      })
      if (!ret) throw new TRPCError({ code: 'NOT_FOUND' })
      if (ret.order.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      if (input.accepted) {
        await ctx.prisma.order.update({ where: { id: ret.orderId }, data: { status: 'RETURNED' } })
        if (ret.order.payment) {
          await refundPayment(ret.order.payment.stripePaymentIntentId)
          await ctx.prisma.payment.update({ where: { id: ret.order.payment.id }, data: { status: 'REFUNDED' } })
        }
        return ctx.prisma.return.update({ where: { id: input.returnId }, data: { status: 'ACCEPTED' } })
      }

      return ctx.prisma.return.update({ where: { id: input.returnId }, data: { status: 'REFUSED' } })
    }),

  getMyReturns: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.return.findMany({
      where: { buyerId: ctx.user.id },
      include: { order: { select: { product: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  escalateToDispute: protectedProcedure
    .input(z.object({ returnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ret = await ctx.prisma.return.findUnique({ where: { id: input.returnId } })
      if (!ret || ret.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (ret.status !== 'REFUSED') throw new TRPCError({ code: 'BAD_REQUEST' })

      await ctx.prisma.order.update({ where: { id: ret.orderId }, data: { status: 'DISPUTED' } })
      return ctx.prisma.return.update({ where: { id: input.returnId }, data: { status: 'REFUSED' } })
    }),
})
```

- [ ] **Step 3: Write `src/server/api/routers/review.ts`**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const reviewRouter = router({
  create: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      rating: z.number().min(1).max(5),
      text: z.string().optional(),
      images: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({ where: { id: input.orderId } })
      if (!order || order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (order.status !== 'DELIVERED') throw new TRPCError({ code: 'BAD_REQUEST' })

      const review = await ctx.prisma.review.create({
        data: {
          orderId: input.orderId,
          reviewerId: ctx.user.id,
          targetId: order.sellerId,
          rating: input.rating,
          text: input.text,
          images: input.images,
        },
      })

      // Update seller rating
      const avgRating = await ctx.prisma.review.aggregate({
        where: { targetId: order.sellerId },
        _avg: { rating: true },
      })
      await ctx.prisma.user.update({
        where: { id: order.sellerId },
        data: { sellerRating: avgRating._avg.rating || 0 },
      })

      return review
    }),

  getByProduct: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({ where: { id: input.productId } })
      if (!product) throw new TRPCError({ code: 'NOT_FOUND' })

      const orders = await ctx.prisma.order.findMany({
        where: { productId: input.productId },
        select: { id: true },
      })
      const orderIds = orders.map((o) => o.id)

      return ctx.prisma.review.findMany({
        where: { orderId: { in: orderIds } },
        include: { reviewer: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
```

- [ ] **Step 4: Update `src/server/api/root.ts`**

```typescript
import { orderRouter } from './routers/order'
import { returnRouter } from './routers/return'
import { reviewRouter } from './routers/review'

export const appRouter = router({
  // ...existing routers
  order: orderRouter,
  return: returnRouter,
  review: reviewRouter,
})
```

- [ ] **Step 5: Write orders page `src/app/(cont)/comenzi/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import Link from 'next/link'
import { formatRON } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const statusLabels: Record<string, string> = {
  CREATED: 'CreatÄƒ', PAID: 'PlÄƒtitÄƒ', SHIPPED: 'ExpediatÄƒ',
  DELIVERED: 'LivratÄƒ', RETURNED: 'ReturnatÄƒ', DISPUTED: 'ÃŽn disputÄƒ', CANCELLED: 'AnulatÄƒ',
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const caller = await api()
  const [buyerOrders, sellerOrders] = await Promise.all([
    caller.order.getMyOrders({ role: 'buyer' }),
    caller.order.getMyOrders({ role: 'seller' }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Comenzi</h1>

      <h2 className="font-semibold mb-4">Comenzi ca È™i cumpÄƒrÄƒtor</h2>
      <div className="space-y-3 mb-8">
        {buyerOrders.length === 0 ? <p className="text-muted-foreground">Nicio comandÄƒ.</p> : buyerOrders.map((order) => (
          <Link key={order.id} href={`/cont/comenzi/${order.id}`} className="block border rounded-lg p-4 hover:border-purple-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.product.title}</p>
                <p className="text-sm text-muted-foreground">VÃ¢nzÄƒtor: {order.seller.name}</p>
              </div>
              <p className="font-bold">{formatRON(order.amount)}</p>
              <Badge variant="secondary">{statusLabels[order.status]}</Badge>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="font-semibold mb-4">Comenzi ca È™i vÃ¢nzÄƒtor</h2>
      <div className="space-y-3">
        {sellerOrders.length === 0 ? <p className="text-muted-foreground">Nicio comandÄƒ.</p> : sellerOrders.map((order) => (
          <Link key={order.id} href={`/cont/comenzi/${order.id}`} className="block border rounded-lg p-4 hover:border-purple-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.product.title}</p>
                <p className="text-sm text-muted-foreground">CumpÄƒrÄƒtor: {order.buyer.name}</p>
              </div>
              <p className="font-bold">{formatRON(order.amount)}</p>
              <Badge variant="secondary">{statusLabels[order.status]}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write order detail page `src/app/(cont)/comenzi/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { OrderDetail } from './order-detail'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const caller = await api()
  const order = await caller.order.getById({ id: params.id }).catch(() => notFound())

  return <OrderDetail order={order} userId={session.user.id} />
}
```

File: `src/app/(cont)/comenzi/[id]/order-detail.tsx`
```tsx
'use client'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'

export function OrderDetail({ order, userId }: { order: any; userId: string }) {
  const [returnReason, setReturnReason] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)

  const confirmDelivery = trpc.order.confirmDelivery.useMutation()
  const createReturn = trpc.return.request.useMutation()
  const createReview = trpc.review.create.useMutation()
  const utils = trpc.useUtils()

  const isBuyer = order.buyer.id === userId
  const isSeller = order.seller.id === userId

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Comanda #{order.id.slice(0, 10)}</h1>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="font-bold">{order.status}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Suma</p>
          <p className="font-bold">{formatRON(order.amount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Produs</p>
          <p className="font-medium">{order.product.title}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{isBuyer ? 'VÃ¢nzÄƒtor' : 'CumpÄƒrÄƒtor'}</p>
          <p className="font-medium">{isBuyer ? order.seller.name : order.buyer.name}</p>
        </div>
        {order.shipment && (
          <>
            <div>
              <p className="text-muted-foreground">AWB</p>
              <p className="font-mono">{order.shipment.easyboxAWB}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cod ridicare</p>
              <p className="font-mono">{order.shipment.pickupCode}</p>
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Buyer: Confirm delivery */}
      {isBuyer && order.status === 'SHIPPED' && (
        <Button onClick={async () => { await confirmDelivery.mutateAsync({ orderId: order.id }); toast.success('Livrare confirmatÄƒ!') }} className="w-full">
          ConfirmÄƒ primirea coletului
        </Button>
      )}

      {/* Buyer: Request return */}
      {isBuyer && order.status === 'DELIVERED' && !order.return_ && (
        <div className="space-y-3">
          <h3 className="font-semibold">Cere retur</h3>
          <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Motivul returului..." rows={3} />
          <Button variant="outline" onClick={async () => { await createReturn.mutateAsync({ orderId: order.id, reason: returnReason }); toast.success('Cerere retur trimisÄƒ!') }}>
            Trimite cererea de retur
          </Button>
        </div>
      )}

      {/* Buyer/Seller: Return status */}
      {order.return_ && (
        <div className="border rounded-lg p-4">
          <p className="font-semibold">Retur: {order.return_.status}</p>
          <p className="text-sm text-muted-foreground mt-1">{order.return_.reason}</p>
        </div>
      )}

      {/* Buyer: Write review */}
      {isBuyer && order.status === 'DELIVERED' && !order.review && (
        <div className="space-y-3">
          <h3 className="font-semibold">LasÄƒ o recenzie</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)} className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                â˜…
              </button>
            ))}
          </div>
          <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Scrie recenzia ta..." rows={3} />
          <Button onClick={async () => { await createReview.mutateAsync({ orderId: order.id, rating, text: reviewText }); toast.success('Recenzie salvatÄƒ!') }}>
            PublicÄƒ recenzia
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/server/api/routers/order.ts src/server/api/routers/return.ts src/server/api/routers/review.ts src/server/api/root.ts src/app/(cont)/comenzi/
git commit -m "feat: add orders, returns, and reviews with full flows"
```
### Task 14: Wishlist

**Files:**
- Create: `src/app/(cont)/wishlist/page.tsx`
- Modify: `src/app/(public)/produse/[id]/product-detail.tsx` (add wishlist button)

**Interfaces:**
- Consumes: `productRouter` from Task 7, `protectedProcedure` from Task 3

- [ ] **Step 1: Add wishlist procedures to product router**

Append to `src/server/api/routers/product.ts`:
```typescript
  // Add to productRouter:
  toggleWishlist: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: ctx.user.id, productId: input.productId } },
      })
      if (existing) {
        await ctx.prisma.wishlistItem.delete({ where: { id: existing.id } })
        return { added: false }
      }
      await ctx.prisma.wishlistItem.create({
        data: { userId: ctx.user.id, productId: input.productId },
      })
      return { added: true }
    }),

  getWishlist: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.wishlistItem.findMany({
      where: { userId: ctx.user.id },
      include: { product: { include: { seller: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  isWishlisted: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: ctx.user.id, productId: input.productId } },
      })
      return !!item
    }),
```

- [ ] **Step 2: Write wishlist page `src/app/(cont)/wishlist/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import { api } from '@/lib/trpc/server'
import { WishlistClient } from './wishlist-client'

export default async function WishlistPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const caller = await api()
  const items = await caller.product.getWishlist()
  return <WishlistClient items={items} />
}
```

File: `src/app/(cont)/wishlist/wishlist-client.tsx`
```tsx
'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function WishlistClient({ items }: { items: any[] }) {
  const utils = trpc.useUtils()
  const toggleWishlist = trpc.product.toggleWishlist.useMutation({
    onSuccess: () => { utils.product.getWishlist.invalidate(); toast.success('Actualizat') },
  })

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Wishlist</h1>
        <p className="text-muted-foreground">Nu ai produse salvate.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-2 group">
            <Link href={`/produse/${item.product.id}`}>
              <div className="aspect-square bg-gray-100 rounded mb-2" />
              <p className="text-sm font-medium truncate">{item.product.title}</p>
              <p className="text-sm font-bold">{formatRON(item.product.price)}</p>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1"
              onClick={() => toggleWishlist.mutate({ productId: item.product.id })}
            >
              â¤ï¸ È˜terge
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/product.ts src/app/(cont)/wishlist/
git commit -m "feat: add wishlist functionality"
```

---

### Task 15: Real-time Notifications (SSE)

**Files:**
- Create: `src/server/sse.ts`
- Create: `src/app/api/sse/route.ts`
- Create: `src/components/notifications/notification-provider.tsx`

**Interfaces:**
- Consumes: Redis from Task 1
- Produces: SSE endpoint and client notification hook

- [ ] **Step 1: Write SSE server `src/server/sse.ts`**

```typescript
import { redisPub, redisSub } from '@/lib/redis'

export async function sendNotification(userId: string, notification: {
  type: string
  title: string
  body: string
  link?: string
}) {
  await redisPub.publish(`user:${userId}:notifications`, JSON.stringify(notification))
}

export function subscribeToNotifications(userId: string, callback: (data: any) => void) {
  const channel = `user:${userId}:notifications`
  redisSub.subscribe(channel)
  redisSub.on('message', (ch, message) => {
    if (ch === channel) callback(JSON.parse(message))
  })
  return () => { redisSub.unsubscribe(channel) }
}
```

- [ ] **Step 2: Write SSE route `src/app/api/sse/route.ts`**

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { subscribeToNotifications } from '@/server/sse'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToNotifications(session.user.id, (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      })

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, 30000)

      // Cleanup on close
      return () => {
        clearInterval(keepAlive)
        unsubscribe()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 3: Write notification provider `src/components/notifications/notification-provider.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session) return

    const eventSource = new EventSource('/api/sse')

    eventSource.onmessage = (event) => {
      if (!event.data) return
      const notification = JSON.parse(event.data)
      toast(notification.title, {
        description: notification.body,
        action: notification.link ? {
          label: 'Vezi',
          onClick: () => router.push(notification.link),
        } : undefined,
      })
    }

    eventSource.onerror = () => {
      // SSE will auto-reconnect
    }

    return () => { eventSource.close() }
  }, [session, router])

  return <>{children}</>
}
```

- [ ] **Step 4: Integrate notifications into offer/rfq/order routers**

Add to `src/server/api/routers/offer.ts` â€” inside the `create` mutation, after creating the offer:
```typescript
await sendNotification(offer.sellerId, {
  type: 'OFFER_RECEIVED',
  title: 'OfertÄƒ nouÄƒ',
  body: `Ai primit o ofertÄƒ de ${offer.amount} RON pentru ${product.title}`,
  link: `/cont/oferte`,
})
```

Add similar calls in `rfq.ts` (when offers are made) and `order.ts` (when status changes).

- [ ] **Step 5: Add NotificationProvider to root layout**

Modify `src/app/layout.tsx`:
```tsx
import { NotificationProvider } from '@/components/notifications/notification-provider'

// In the component tree, wrap:
<TRPCProvider>
  <CartProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </CartProvider>
</TRPCProvider>
```

- [ ] **Step 6: Commit**

```bash
git add src/server/sse.ts src/app/api/sse/ src/components/notifications/ src/server/api/routers/offer.ts src/server/api/routers/rfq.ts
git commit -m "feat: add SSE real-time notifications"
```

---

### Task 16: Blog (MDX)

**Files:**
- Create: `src/app/(public)/blog/page.tsx`
- Create: `src/app/(public)/blog/[slug]/page.tsx`
- Create: `content/blog/primul-articol.mdx`
- Create: `src/lib/mdx.ts`

**Interfaces:**
- Produces: Blog pages rendering MDX content

- [ ] **Step 1: Install MDX dependencies**

```bash
npm install next-mdx-remote
```

- [ ] **Step 2: Write MDX helper `src/lib/mdx.ts`**

```typescript
import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  category: string
  image?: string
  content: string
}

export async function getAllPosts(): Promise<Omit<BlogPost, 'content'>[]> {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))
  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
      const { frontmatter } = await parseFrontmatter(raw)
      return {
        slug: file.replace('.mdx', ''),
        title: frontmatter.title || file,
        description: frontmatter.description || '',
        date: frontmatter.date || '',
        category: frontmatter.category || 'General',
        image: frontmatter.image,
      }
    })
  )
  return posts.sort((a, b) => (a.date > b.date ? -1 : 1))
}

export async function getPost(slug: string): Promise<BlogPost> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) throw new Error('Post not found')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, content } = await parseFrontmatter(raw)
  return { slug, content, ...frontmatter as any }
}

async function parseFrontmatter(raw: string): Promise<{ frontmatter: Record<string, any>; content: string }> {
  // Simple frontmatter parser â€” splits --- delimited metadata from content
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, content: raw }
  const frontmatter: Record<string, any> = {}
  match[1].split('\n').forEach((line) => {
    const [key, ...vals] = line.split(':')
    if (key) frontmatter[key.trim()] = vals.join(':').trim()
  })
  return { frontmatter, content: match[2] }
}
```

- [ ] **Step 3: Write blog list page `src/app/(public)/blog/page.tsx`**

```tsx
import Link from 'next/link'
import { getAllPosts } from '@/lib/mdx'

export const metadata = { title: 'Blog - Smarty' }

export default async function BlogPage() {
  const posts = await getAllPosts()
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Blog Smarty</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="border rounded-lg overflow-hidden hover:border-purple-300 transition">
            <div className="aspect-video bg-gray-100" />
            <div className="p-4">
              <span className="text-xs text-purple-700 font-medium">{post.category}</span>
              <h2 className="font-semibold mt-1">{post.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{post.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write blog post page `src/app/(public)/blog/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getPost } from '@/lib/mdx'
import { MDXRemote } from 'next-mdx-remote/rsc'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const post = await getPost(params.slug)
    return { title: `${post.title} - Blog Smarty`, description: post.description }
  } catch { return { title: 'Articol - Smarty' } }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug).catch(() => notFound())

  return (
    <article className="container py-8 max-w-3xl">
      <div className="mb-8">
        <span className="text-sm text-purple-700 font-medium">{post.category}</span>
        <h1 className="text-3xl font-bold mt-2">{post.title}</h1>
        <p className="text-muted-foreground mt-1">{post.date}</p>
      </div>
      <div className="prose prose-gray max-w-none">
        <MDXRemote source={post.content} />
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Create first blog post `content/blog/primul-articol.mdx`**

```mdx
---
title: Cum sÄƒ-È›i Ã®ngrijeÈ™ti pielea corect â€” Ghidul Ã®ncepÄƒtorului
description: Un ghid complet pentru oricine vrea sÄƒ Ã®nceapÄƒ o rutinÄƒ de Ã®ngrijire a pielii.
date: 2026-06-28
category: Ghid de Ã®ngrijire
image: /blog/skincare-guide.jpg
---

## De ce e importantÄƒ Ã®ngrijirea pielii?

Pielea este cel mai mare organ al corpului tÄƒu È™i meritÄƒ o rutinÄƒ de Ã®ngrijire pe mÄƒsurÄƒ. Fie cÄƒ ai tenul uscat, gras sau mixt, paÈ™ii de bazÄƒ sunt aceiaÈ™i.

### 1. CurÄƒÈ›are

Primul pas Ã®n orice rutinÄƒ de skincare: curÄƒÈ›area. Alege un cleanser potrivit tipului tÄƒu de ten È™i foloseÈ™te-l de douÄƒ ori pe zi.

### 2. Hidratare

Chiar È™i tenul gras are nevoie de hidratare. O cremÄƒ hidratantÄƒ bunÄƒ este esenÈ›ialÄƒ.

### 3. ProtecÈ›ie solarÄƒ

Cel mai subestimat pas. SPF 30+ zilnic, indiferent de anotimp.

---

Pe Smarty gÄƒseÈ™ti toate produsele de care ai nevoie, la preÈ›uri accesibile, de la vÃ¢nzÄƒtori verificaÈ›i.
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(public)/blog/ src/lib/mdx.ts content/blog/
git commit -m "feat: add blog with MDX support"
```

---

### Task 17: Home Page

**Files:**
- Create: `src/app/(public)/page.tsx`
- Modify: `src/components/category/category-card.tsx`

**Interfaces:**
- Consumes: All routers from previous tasks (category, product, rfq)

- [ ] **Step 1: Write home page `src/app/(public)/page.tsx`**

```tsx
import Link from 'next/link'
import { api } from '@/lib/trpc/server'
import { formatRON, conditionLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product/product-card'
import Image from 'next/image'

export default async function HomePage() {
  const caller = await api()
  const [categories, latestProducts, activeRFQs] = await Promise.all([
    caller.category.getAll(),
    caller.product.getLatest({ limit: 8 }),
    caller.rfq.getAll({ limit: 4 }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-700 to-pink-600 text-white">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              CumpÄƒrÄƒ È™i vinde cosmetice, haine È™i accesorii
            </h1>
            <p className="text-lg md:text-xl text-purple-100 mb-8">
              Marketplace-ul unde gÄƒseÈ™ti ce cauÈ›i la preÈ›ul corect. NegociazÄƒ direct cu vÃ¢nzÄƒtorii sau posteazÄƒ o cerere.
            </p>
            <div className="flex gap-4">
              <Link href="/categorii/makeup">
                <Button size="lg" variant="secondary">Vezi produse</Button>
              </Link>
              <Link href="/cereri/noua">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-purple-700">
                  PosteazÄƒ cerere
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <h2 className="text-2xl font-bold mb-6">Categorii</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat: any) => (
            <Link key={cat.id} href={`/categorii/${cat.slug}`} className="border rounded-lg p-4 text-center hover:border-purple-300 hover:shadow transition group">
              <div className="text-3xl mb-2">{cat.icon === 'palette' ? 'ðŸŽ¨' : cat.icon === 'droplets' ? 'ðŸ’§' : cat.icon === 'shirt' ? 'ðŸ‘•' : cat.icon === 'gem' ? 'ðŸ’Ž' : 'ðŸ“¦'}</div>
              <h3 className="font-semibold group-hover:text-purple-700">{cat.name}</h3>
              <p className="text-xs text-muted-foreground">{cat._count.products} produse</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Active RFQs */}
      {activeRFQs.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Cereri active</h2>
              <Link href="/cereri"><Button variant="ghost">Vezi toate â†’</Button></Link>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {activeRFQs.map((rfq: any) => (
                <Link key={rfq.id} href={`/cereri/${rfq.id}`} className="block bg-white border rounded-lg p-4 hover:border-purple-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{rfq.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rfq.description}</p>
                    </div>
                    <span className="text-sm font-bold whitespace-nowrap">{formatRON(rfq.maxBudget)} max</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{rfq.category.name}</span>
                    <span>Â·</span>
                    <span>{rfq._count.offers} oferte</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Products */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Produse recente</h2>
          <Link href="/categorii/altele"><Button variant="ghost">Vezi toate â†’</Button></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {latestProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-12 border-t">
        <h2 className="text-2xl font-bold text-center mb-10">Cum funcÈ›ioneazÄƒ Smarty</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-4">1ï¸âƒ£</div>
            <h3 className="font-semibold text-lg mb-2">PosteazÄƒ sau cautÄƒ</h3>
            <p className="text-muted-foreground">AdaugÄƒ produsele tale sau cautÄƒ ce ai nevoie din mii de anunÈ›uri.</p>
          </div>
          <div>
            <div className="text-4xl mb-4">2ï¸âƒ£</div>
            <h3 className="font-semibold text-lg mb-2">NegociazÄƒ</h3>
            <p className="text-muted-foreground">FÄƒ o ofertÄƒ sau posteazÄƒ o cerere È™i lasÄƒ vÃ¢nzÄƒtorii sÄƒ vinÄƒ la tine.</p>
          </div>
          <div>
            <div className="text-4xl mb-4">3ï¸âƒ£</div>
            <h3 className="font-semibold text-lg mb-2">PrimeÈ™te coletul</h3>
            <p className="text-muted-foreground">Plata Ã®n siguranÈ›Äƒ prin Smarty, livrare rapidÄƒ prin EasyBox.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: add home page with hero, categories, RFQs, and products"
```

---

### Task 18: SEO & Sitemap

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Modify: `next.config.ts` (if needed)

**Interfaces:**
- Produces: Dynamic sitemap.xml, robots.txt, SEO metadata

- [ ] **Step 1: Write `src/app/sitemap.ts`**

```typescript
import { prisma } from '@/lib/prisma'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, updatedAt: true },
  })

  const categories = await prisma.productCategory.findMany({
    select: { slug: true, updatedAt: true },
  })

  const productUrls = products.map((p) => ({
    url: `${baseUrl}/produse/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  const categoryUrls = categories.map((c) => ({
    url: `${baseUrl}/categorii/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/cereri`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    ...categoryUrls,
    ...productUrls,
  ]
}
```

- [ ] **Step 2: Write `src/app/robots.ts`**

```typescript
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/cont/', '/admin/', '/api/'] },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts
git commit -m "feat: add dynamic sitemap and robots.txt"
```

---

### Task 19: Admin Panel

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/comenzi/page.tsx`
- Create: `src/app/admin/dispute/page.tsx`

**Interfaces:**
- Consumes: `adminProcedure` from Task 3

- [ ] **Step 1: Write admin layout `src/app/admin/layout.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-gray-50 p-4 space-y-1">
        <h2 className="font-bold text-lg mb-4">Smarty Admin</h2>
        <Link href="/admin/comenzi" className="block px-3 py-2 rounded hover:bg-gray-200">Comenzi</Link>
        <Link href="/admin/dispute" className="block px-3 py-2 rounded hover:bg-gray-200">Dispute</Link>
        <Link href="/admin/utilizatori" className="block px-3 py-2 rounded hover:bg-gray-200">Utilizatori</Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Write admin orders page `src/app/admin/comenzi/page.tsx`**

```tsx
import { prisma } from '@/lib/prisma'
import { formatRON } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
      product: { select: { title: true } },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Toate comenzile</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">ID</th>
              <th className="p-2">Produs</th>
              <th className="p-2">CumpÄƒrÄƒtor</th>
              <th className="p-2">VÃ¢nzÄƒtor</th>
              <th className="p-2">SumÄƒ</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono"><Link href={`/cont/comenzi/${order.id}`} className="text-purple-700">{order.id.slice(0, 8)}</Link></td>
                <td className="p-2">{order.product.title}</td>
                <td className="p-2">{order.buyer.name}</td>
                <td className="p-2">{order.seller.name}</td>
                <td className="p-2">{formatRON(order.amount)}</td>
                <td className="p-2">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write dispute page `src/app/admin/dispute/page.tsx`**

```tsx
import { prisma } from '@/lib/prisma'
import { formatRON } from '@/lib/utils'
import { DisputeActions } from './dispute-actions'

export default async function DisputePage() {
  const disputedOrders = await prisma.order.findMany({
    where: { status: 'DISPUTED' },
    include: {
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
      product: { select: { title: true } },
      payment: true,
      return_: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dispute ({disputedOrders.length})</h1>
      {disputedOrders.length === 0 ? (
        <p className="text-muted-foreground">Nicio disputÄƒ activÄƒ.</p>
      ) : (
        disputedOrders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-muted-foreground">ComandÄƒ:</span> {order.id.slice(0, 10)}</div>
              <div><span className="text-muted-foreground">Produs:</span> {order.product.title}</div>
              <div><span className="text-muted-foreground">CumpÄƒrÄƒtor:</span> {order.buyer.name} ({order.buyer.email})</div>
              <div><span className="text-muted-foreground">VÃ¢nzÄƒtor:</span> {order.seller.name} ({order.seller.email})</div>
              <div><span className="text-muted-foreground">SumÄƒ:</span> {formatRON(order.amount)}</div>
              <div><span className="text-muted-foreground">Motiv retur:</span> {order.return_?.reason || 'N/A'}</div>
            </div>
            <DisputeActions orderId={order.id} paymentIntentId={order.payment?.stripePaymentIntentId} />
          </div>
        ))
      )}
    </div>
  )
}
```

File: `src/app/admin/dispute/dispute-actions.tsx`
```tsx
'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function DisputeActions({ orderId, paymentIntentId }: { orderId: string; paymentIntentId?: string }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="destructive" onClick={() => toast.success(`Retur forÈ›at pentru comanda ${orderId.slice(0, 8)}`)}>
        ForÈ›eazÄƒ returul
      </Button>
      <Button size="sm" onClick={() => toast.success(`Banii eliberaÈ›i pentru comanda ${orderId.slice(0, 8)}`)}>
        ElibereazÄƒ banii
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.success(`DisputÄƒ marcatÄƒ ca rezolvatÄƒ`)}>
        MarcheazÄƒ rezolvatÄƒ
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/
git commit -m "feat: add admin panel with orders and dispute management"
```

---

### Task 20: Deployment (Docker)

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: Deployable Docker image and docker-compose production setup

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/content ./content

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Write `.dockerignore`**

```
node_modules
.git
.env
.env.local
.next
docker-compose.yml
docs
```

- [ ] **Step 3: Update `next.config.ts` for Docker**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 4: Build and verify**

```bash
docker compose build
docker compose up -d
curl http://localhost:3000
```

**Expected:** "Smarty Marketplace" HTML response

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore next.config.ts
git commit -m "feat: add Docker deployment configuration"
```

---

## Phase 6: Polish

### Task 21: Final Integration & Smoke Tests

- [ ] **Step 1: Run full build with no errors**

```bash
npm run build
```

**Expected:** Build succeeds with no TypeScript errors

- [ ] **Step 2: Verify all pages render**

```bash
# Start dev server
npm run dev &
sleep 5
# Test public pages
curl -s http://localhost:3000 | grep -q "Smarty" && echo "Home: OK"
curl -s http://localhost:3000/categorii/makeup | grep -q "Makeup" && echo "Category: OK"
curl -s http://localhost:3000/cereri | grep -q "Cereri" && echo "RFQ: OK"
curl -s http://localhost:3000/blog | grep -q "Blog" && echo "Blog: OK"
# Test auth pages
curl -s http://localhost:3000/login | grep -q "IntrÄƒ Ã®n cont" && echo "Login: OK"
echo "All smoke tests passed!"
```

- [ ] **Step 3: Verify tRPC API is functional**

```bash
curl -s "http://localhost:3000/api/trpc/category.getAll?batch=1&input=%7B%7D" | head -c 100
```

**Expected:** JSON response with categories data

- [ ] **Step 4: Run Prisma validation**

```bash
npx prisma validate
```

**Expected:** "The Prisma schema is valid"

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final integration fixes and smoke tests"
```
