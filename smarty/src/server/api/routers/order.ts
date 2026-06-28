import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { stripe } from '@/server/stripe'

const orderStatusEnum = z.enum([
  'CREATED',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'DISPUTED',
  'CANCELLED',
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
    select: { id: true, name: true, image: true },
  },
  seller: {
    select: { id: true, name: true, image: true },
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
  review: {
    select: { id: true, rating: true, text: true, createdAt: true },
  },
  return_: {
    select: { id: true, status: true, reason: true, createdAt: true },
  },
} as const

export const orderRouter = router({
  /**
   * Get all orders for the current user as a buyer.
   */
  getMyOrders: protectedProcedure
    .input(
      z
        .object({
          status: orderStatusEnum.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id
      const where: Record<string, unknown> = { buyerId: userId }
      if (input?.status) {
        where.status = input.status
      }
      return ctx.prisma.order.findMany({
        where: where as any,
        include: orderWithIncludes,
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get all orders for the current user as a seller.
   */
  getMySales: protectedProcedure
    .input(
      z
        .object({
          status: orderStatusEnum.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id
      const where: Record<string, unknown> = { sellerId: userId }
      if (input?.status) {
        where.status = input.status
      }
      return ctx.prisma.order.findMany({
        where: where as any,
        include: orderWithIncludes,
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get a single order by ID.
   * Both buyer and seller of the order can access it.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: orderWithIncludes,
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comanda nu a fost gasita',
        })
      }

      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nu ai acces la aceasta comanda',
        })
      }

      return order
    }),

  /**
   * Confirm delivery of an order.
   * Only the buyer can confirm. Order must be SHIPPED.
   * Atomically updates Order to DELIVERED and Payment to RELEASED.
   */
  confirmDelivery: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comanda nu a fost gasita',
        })
      }

      if (order.buyerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar cumparatorul poate confirma primirea comenzii',
        })
      }

      if (order.status !== 'SHIPPED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Comanda nu a fost expediata inca',
        })
      }

      if (!order.payment || order.payment.status !== 'HELD') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Plata nu mai este in escrow',
        })
      }

      // Capture the Stripe PaymentIntent (release escrow)
      await stripe.paymentIntents.capture(order.payment.stripePaymentIntentId)

      // Atomically update Order and Payment statuses
      await ctx.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: input.orderId },
          data: { status: 'DELIVERED' },
        })
        await tx.payment.update({
          where: { orderId: input.orderId },
          data: { status: 'RELEASED', escrowReleasedAt: new Date() },
        })
      })

      return { success: true }
    }),
})
