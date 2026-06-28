import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, adminProcedure } from "../trpc"
import { stripe } from "@/server/stripe"

const orderStatusEnum = z.enum([
  "CREATED",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "DISPUTED",
  "CANCELLED",
])

const productStatusEnum = z.enum(["ACTIVE", "SOLD", "HIDDEN"])

const userRoleEnum = z.enum(["USER", "ADMIN"])

const orderWithIncludes = {
  product: {
    select: {
      id: true,
      title: true,
      price: true,
      images: true,
      status: true,
    },
  },
  buyer: {
    select: { id: true, name: true, image: true, email: true },
  },
  seller: {
    select: { id: true, name: true, image: true, email: true },
  },
  payment: {
    select: { id: true, status: true, amount: true },
  },
  shipment: {
    select: {
      id: true,
      easyboxAWB: true,
      trackingUrl: true,
      pickupCode: true,
      status: true,
      estimatedDelivery: true,
    },
  },
  return_: {
    select: { id: true, status: true, reason: true, createdAt: true },
  },
} as const

const productWithIncludes = {
  seller: {
    select: { id: true, name: true, email: true, image: true },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  variants: true,
} as const

function isDemo(): boolean {
  return process.env.USE_DEMO_DATA !== 'false'
}

export const adminRouter = router({
  /**
   * Get dashboard stats (counts for orders, users, products, disputes).
   */
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, totalProducts, totalOrders, disputedOrders, totalRevenue] =
      await ctx.prisma.$transaction([
        ctx.prisma.user.count(),
        ctx.prisma.product.count({ where: { status: "ACTIVE" } }),
        ctx.prisma.order.count(),
        ctx.prisma.order.count({ where: { status: "DISPUTED" } }),
        ctx.prisma.payment.aggregate({
          where: { status: "RELEASED" },
          _sum: { amount: true },
        }),
      ])

    return {
      totalUsers: totalUsers ?? 0,
      totalProducts: totalProducts ?? 0,
      totalOrders: totalOrders ?? 0,
      disputedOrders: disputedOrders ?? 0,
      totalRevenue: (totalRevenue as any)?._sum?.amount ?? 0,
    }
  }),

  /**
   * Get all orders with optional status filter.
   */
  getAllOrders: adminProcedure
    .input(
      z
        .object({
          status: orderStatusEnum.optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}
      if (input?.status) {
        where.status = input.status
      }

      const [orders, total] = await ctx.prisma.$transaction([
        ctx.prisma.order.findMany({
          where: where as any,
          include: orderWithIncludes,
          orderBy: { createdAt: "desc" },
          take: input?.limit ?? 50,
          skip: input?.offset ?? 0,
        }),
        ctx.prisma.order.count({ where: where as any }),
      ])

      return { orders, total }
    }),

  /**
   * Get all disputed orders (status = DISPUTED).
   */
  getDisputedOrders: adminProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: { status: "DISPUTED" },
      include: {
        ...orderWithIncludes,
        return_: {
          select: { id: true, status: true, reason: true, createdAt: true, images: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return orders
  }),

  /**
   * Get latest orders for dashboard (limited to 5).
   */
  getLatestOrders: adminProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      include: orderWithIncludes,
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    return orders
  }),

  /**
   * Get all users with optional search filter.
   */
  getUsers: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (isDemo()) {
        // Direct demo data access for user listing with search
        const { demoUsers } = await import("@/lib/demo-data")
        let filtered = [...demoUsers]

        if (input?.search) {
          const q = input.search.toLowerCase()
          filtered = filtered.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q),
          )
        }

        const total = filtered.length
        const users = filtered.slice(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 100))

        return { users, total }
      }

      const where: Record<string, unknown> = {}
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ]
      }

      const [users, total] = await ctx.prisma.$transaction([
        ctx.prisma.user.findMany({
          where: where as any,
          orderBy: { createdAt: "desc" },
          take: input?.limit ?? 100,
          skip: input?.offset ?? 0,
        }),
        ctx.prisma.user.count({ where: where as any }),
      ])

      return { users, total }
    }),

  /**
   * Update a user (ban/unban, change role).
   */
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: userRoleEnum.optional(),
        status: z.enum(["ACTIVE", "BANNED"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (isDemo()) {
        const { demoUsers } = await import("@/lib/demo-data")
        const user = demoUsers.find((u) => u.id === input.userId)
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizatorul nu a fost gasit" })
        }
        if (input.role) user.role = input.role
        if (input.status) user.status = input.status
        return { success: true }
      }

      const existing = await ctx.prisma.user.findUnique({ where: { id: input.userId } })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizatorul nu a fost gasit" })
      }

      const data: Record<string, unknown> = {}
      if (input.role) data.role = input.role
      if (input.status) data.status = input.status

      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: data as any,
      })

      return { success: true }
    }),

  /**
   * Delete a user.
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (isDemo()) {
        const { demoUsers } = await import("@/lib/demo-data")
        const idx = demoUsers.findIndex((u) => u.id === input.userId)
        if (idx === -1) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizatorul nu a fost gasit" })
        }
        demoUsers.splice(idx, 1)
        return { success: true }
      }

      const existing = await ctx.prisma.user.findUnique({ where: { id: input.userId } })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizatorul nu a fost gasit" })
      }

      await ctx.prisma.user.delete({ where: { id: input.userId } })
      return { success: true }
    }),

  /**
   * Get all products (admin view).
   */
  getAllProducts: adminProcedure
    .input(
      z
        .object({
          status: productStatusEnum.optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (isDemo()) {
        const { demoProducts, demoUsers } = await import("@/lib/demo-data")
        let filtered = [...demoProducts]

        if (input?.status) {
          filtered = filtered.filter((p) => p.status === input.status)
        }

        if (input?.search) {
          const q = input.search.toLowerCase()
          filtered = filtered.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q),
          )
        }

        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        const total = filtered.length
        const products = filtered.slice(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 50)).map((p) => {
          const seller = demoUsers.find((u) => u.id === p.sellerId)
          return { ...p, seller: seller ? { id: seller.id, name: seller.name, email: seller.email, image: seller.image } : null, category: null, variants: [] }
        })

        return { products, total }
      }

      const where: Record<string, unknown> = {}
      if (input?.status) {
        where.status = input.status
      }
      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ]
      }

      const [products, total] = await ctx.prisma.$transaction([
        ctx.prisma.product.findMany({
          where: where as any,
          include: productWithIncludes,
          orderBy: { createdAt: "desc" },
          take: input?.limit ?? 50,
          skip: input?.offset ?? 0,
        }),
        ctx.prisma.product.count({ where: where as any }),
      ])

      return { products, total }
    }),

  /**
   * Admin delete a product.
   */
  deleteProduct: adminProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (isDemo()) {
        const { demoProducts } = await import("@/lib/demo-data")
        const idx = demoProducts.findIndex((p) => p.id === input.productId)
        if (idx === -1) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Produsul nu a fost gasit" })
        }
        demoProducts.splice(idx, 1)
        return { success: true }
      }

      const existing = await ctx.prisma.product.findUnique({ where: { id: input.productId } })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produsul nu a fost gasit" })
      }

      await ctx.prisma.product.delete({ where: { id: input.productId } })
      return { success: true }
    }),

  /**
   * Admin update a product (status, featured).
   */
  updateProduct: adminProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        status: productStatusEnum.optional(),
        featured: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (isDemo()) {
        const { demoProducts } = await import("@/lib/demo-data")
        const product = demoProducts.find((p) => p.id === input.productId)
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Produsul nu a fost gasit" })
        }
        if (input.status) product.status = input.status
        if (input.featured !== undefined) product.featured = input.featured
        product.updatedAt = new Date()
        return { success: true }
      }

      const existing = await ctx.prisma.product.findUnique({ where: { id: input.productId } })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produsul nu a fost gasit" })
      }

      const data: Record<string, unknown> = {}
      if (input.status) data.status = input.status
      if (input.featured !== undefined) data.featured = input.featured

      await ctx.prisma.product.update({
        where: { id: input.productId },
        data: data as any,
      })

      return { success: true }
    }),

  /**
   * Force return a disputed order — refund the buyer, mark order as RETURNED.
   * Admin override — bypasses normal buyer/seller checks.
   */
  forceReturn: adminProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.status !== "DISPUTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Doar comenzile in status Disputa pot fi returnate fortat",
        })
      }

      if (!order.payment || order.payment.status !== "HELD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plata nu mai este in escrow",
        })
      }

      // Refund via Stripe
      await stripe.refunds.create({
        payment_intent: order.payment.stripePaymentIntentId,
      })

      // Atomically update Order, Payment, and Return
      await ctx.prisma.$transaction(async (tx: any) => {
        await tx.order.update({
          where: { id: input.orderId },
          data: { status: "RETURNED" },
        })
        await tx.payment.update({
          where: { orderId: input.orderId },
          data: { status: "REFUNDED" },
        })
        // If there's an existing return request, mark it as REFUNDED
        const existingReturn = await tx.return.findUnique({
          where: { orderId: input.orderId },
        })
        if (existingReturn && existingReturn.status !== "REFUNDED") {
          await tx.return.update({
            where: { orderId: input.orderId },
            data: { status: "REFUNDED" },
          })
        }
      })

      return { success: true }
    }),

  /**
   * Force release escrow — capture the payment, mark order as DELIVERED.
   * Admin override — bypasses normal buyer/seller checks.
   */
  forceRelease: adminProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.status !== "DISPUTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Doar comenzile in status Disputa pot fi eliberate fortat",
        })
      }

      if (!order.payment || order.payment.status !== "HELD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plata nu mai este in escrow",
        })
      }

      // Capture Stripe PaymentIntent (release escrow)
      await stripe.paymentIntents.capture(order.payment.stripePaymentIntentId)

      // Atomically update Order and Payment statuses
      await ctx.prisma.$transaction(async (tx: any) => {
        await tx.order.update({
          where: { id: input.orderId },
          data: { status: "DELIVERED" },
        })
        await tx.payment.update({
          where: { orderId: input.orderId },
          data: { status: "RELEASED", escrowReleasedAt: new Date() },
        })
      })

      return { success: true }
    }),

  /**
   * Resolve a dispute without financial action — mark order as DELIVERED.
   * For cases where the admin determines no action is needed (e.g. already resolved
   * between parties, or escrow was already released outside the system).
   */
  resolveDispute: adminProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.status !== "DISPUTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Doar comenzile in status Disputa pot fi solutionate",
        })
      }

      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: "DELIVERED" },
      })

      return { success: true }
    }),
})
