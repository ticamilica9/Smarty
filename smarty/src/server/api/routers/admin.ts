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
      totalUsers,
      totalProducts,
      totalOrders,
      disputedOrders,
      totalRevenue: totalRevenue._sum.amount ?? 0,
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
