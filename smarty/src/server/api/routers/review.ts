import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '../trpc'

const reviewWithIncludes = {
  reviewer: {
    select: { id: true, name: true, image: true },
  },
  order: {
    select: {
      id: true,
      productId: true,
      product: {
        select: { id: true, title: true, images: true },
      },
    },
  },
} as const

export const reviewRouter = router({
  /**
   * Create a review for a delivered order.
   * Only the buyer can review. Order must be DELIVERED.
   * Only one review per order. Updates the seller's average rating.
   */
  create: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
        rating: z
          .number()
          .int()
          .min(1, 'Ratingul trebuie sa fie intre 1 si 5')
          .max(5, 'Ratingul trebuie sa fie intre 1 si 5'),
        text: z.string().max(2000).optional(),
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
          message: 'Doar cumparatorul poate lasa o recenzie',
        })
      }

      if (order.status !== 'DELIVERED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Comanda trebuie sa fie livrata pentru a putea fi recenzata',
        })
      }

      // Check for existing review
      const existingReview = await ctx.prisma.review.findUnique({
        where: { orderId: input.orderId },
      })
      if (existingReview) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ai lasat deja o recenzie pentru aceasta comanda',
        })
      }

      // Create the review and update seller rating atomically
      const result = await ctx.prisma.$transaction(async (tx: any) => {
        const review = await tx.review.create({
          data: {
            orderId: input.orderId,
            reviewerId: userId,
            targetId: order.sellerId,
            rating: input.rating,
            text: input.text,
            images: input.images,
          },
          include: reviewWithIncludes,
        })

        // Recalculate the seller's average rating
        const aggregation = await tx.review.aggregate({
          where: { targetId: order.sellerId },
          _avg: { rating: true },
        })

        await tx.user.update({
          where: { id: order.sellerId },
          data: {
            sellerRating: aggregation._avg.rating ?? 0,
          },
        })

        return review
      })

      return result
    }),

  /**
   * Get all reviews for a product.
   * Public endpoint.
   */
  getByProduct: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.review.findMany({
        where: {
          order: { productId: input.productId },
        },
        include: {
          reviewer: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
