import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { stripe } from '@/server/stripe'

const returnStatusEnum = z.enum([
  'REQUESTED',
  'ACCEPTED',
  'REFUSED',
  'SHIPPED_BACK',
  'REFUNDED',
])

const returnWithIncludes = {
  order: {
    select: {
      id: true,
      amount: true,
      status: true,
      productId: true,
      buyerId: true,
      sellerId: true,
      product: {
        select: { id: true, title: true, images: true, price: true },
      },
      payment: {
        select: { id: true, status: true, stripePaymentIntentId: true },
      },
    },
  },
  buyer: {
    select: { id: true, name: true, image: true },
  },
} as const

export const returnRouter = router({
  /**
   * Request a return for a delivered order.
   * Only the buyer can request. Must be within 14 days of delivery.
   * Order must be DELIVERED.
   */
  request: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
        reason: z
          .string()
          .min(10, 'Motivul trebuie sa aiba cel putin 10 caractere'),
        images: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
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
          message: 'Doar cumparatorul poate solicita returnarea',
        })
      }

      if (order.status !== 'DELIVERED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Comanda nu a fost livrata inca',
        })
      }

      // Check 14-day window from delivery (order updatedAt is when it was marked delivered)
      const daysSinceDelivery = Math.floor(
        (Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceDelivery > 14) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Perioada de returnare de 14 zile a expirat',
        })
      }

      // Check no existing return for this order
      const existingReturn = await ctx.prisma.return.findUnique({
        where: { orderId: input.orderId },
      })
      if (existingReturn) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Exista deja o cerere de returnare pentru aceasta comanda',
        })
      }

      return ctx.prisma.return.create({
        data: {
          orderId: input.orderId,
          buyerId: userId,
          reason: input.reason,
          images: input.images,
          status: 'REQUESTED',
        },
        include: returnWithIncludes,
      })
    }),

  /**
   * Seller responds to a return request.
   * Accepting triggers a full refund via Stripe and updates Order + Payment.
   * Refusing simply marks the return as refused.
   */
  respond: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        action: z.enum(['ACCEPTED', 'REFUSED']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const returnRequest = await ctx.prisma.return.findUnique({
        where: { id: input.id },
        include: {
          order: {
            include: {
              payment: true,
            },
          },
        },
      })

      if (!returnRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cererea de returnare nu a fost gasita',
        })
      }

      if (returnRequest.order.sellerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar vanzatorul poate raspunde la aceasta cerere',
        })
      }

      if (returnRequest.status !== 'REQUESTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aceasta cerere nu mai este activa',
        })
      }

      if (input.action === 'ACCEPTED') {
        // Refund via Stripe
        const payment = returnRequest.order.payment
        if (!payment || !payment.stripePaymentIntentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nu exista o plata pentru aceasta comanda',
          })
        }

        // Process refund through Stripe
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
        })

        // Atomically update Return, Payment, and Order statuses
        await ctx.prisma.$transaction(async (tx: any) => {
          await tx.return.update({
            where: { id: input.id },
            data: { status: 'ACCEPTED' },
          })
          await tx.payment.update({
            where: { orderId: returnRequest.orderId },
            data: { status: 'REFUNDED' },
          })
          await tx.order.update({
            where: { id: returnRequest.orderId },
            data: { status: 'RETURNED' },
          })
        })

        return { success: true }
      }

      // REFUSED
      await ctx.prisma.return.update({
        where: { id: input.id },
        data: { status: 'REFUSED' },
      })

      return { success: true }
    }),

  /**
   * Get all return requests for the current user (as buyer).
   */
  getMyReturns: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user as { id: string }).id

    return ctx.prisma.return.findMany({
      where: { buyerId: userId },
      include: returnWithIncludes,
      orderBy: { createdAt: 'desc' },
    })
  }),

  /**
   * Escalate a refused return to a dispute.
   * Only the buyer can escalate. The return must be in REFUSED status.
   * Updates the order status to DISPUTED.
   */
  escalateToDispute: protectedProcedure
    .input(z.object({ returnId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const returnRequest = await ctx.prisma.return.findUnique({
        where: { id: input.returnId },
      })

      if (!returnRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cererea de returnare nu a fost gasita',
        })
      }

      if (returnRequest.buyerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar cumparatorul poate escalada catre disputa',
        })
      }

      if (returnRequest.status !== 'REFUSED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cererea de returnare trebuie sa fie refuzata pentru a putea fi escaladata',
        })
      }

      // Update order status to DISPUTED
      await ctx.prisma.order.update({
        where: { id: returnRequest.orderId },
        data: { status: 'DISPUTED' },
      })

      return { success: true }
    }),
})
