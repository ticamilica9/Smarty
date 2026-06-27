import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

const offerWithIncludes = {
  id: true,
  productId: true,
  buyerId: true,
  sellerId: true,
  amount: true,
  status: true,
  counterOfferId: true,
  round: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
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
} as const

export const offerRouter = router({
  /**
   * Create a new offer on a product.
   * Business rules:
   * - Cannot offer on own product
   * - Offer must be less than list price
   * - Max 3 counter-offer rounds
   * - Offer expires after 48 hours
   */
  create: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        amount: z.number().positive('Oferta trebuie sa fie mai mare decat 0'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch the product
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

      // Offer must be less than list price
      if (input.amount >= product.price) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Oferta trebuie sa fie mai mica decat pretul afisat',
        })
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

      // Create offer with 48h expiry
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

      return ctx.prisma.offer.create({
        data: {
          productId: input.productId,
          buyerId: userId,
          sellerId: product.sellerId,
          amount: input.amount,
          round: 1,
          expiresAt,
        },
        include: offerWithIncludes,
      })
    }),

  /**
   * Seller responds to an offer: accepts, refuses, or counters.
   * Counter-offer increments the round (max 3).
   * Accepting creates an Order record.
   */
  respond: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        action: z.enum(['ACCEPTED', 'REFUSED', 'COUNTERED']),
        counterAmount: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.id },
        include: { product: true },
      })

      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Oferta nu a fost gasita',
        })
      }

      // Only the seller can respond
      if (offer.sellerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar vanzatorul poate raspunde la aceasta oferta',
        })
      }

      // Offer must be PENDING or COUNTERED
      if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Oferta nu mai este activa',
        })
      }

      // Check expiry
      if (offer.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Oferta a expirat',
        })
      }

      // Validate counter-offer
      if (input.action === 'COUNTERED') {
        if (!input.counterAmount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Trebuie sa specifici o suma pentru contra-oferta',
          })
        }

        // Counter must be less than product price
        if (input.counterAmount >= offer.product.price) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Contra-oferta trebuie sa fie mai mica decat pretul afisat',
          })
        }

        // Counter must be higher than the original offer
        if (input.counterAmount <= offer.amount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Contra-oferta trebuie sa fie mai mare decat oferta initiala',
          })
        }

        // Max 3 rounds
        if (offer.round >= 3) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Numarul maxim de runde (3) a fost atins',
          })
        }

        // Create a new counter-offer entry
        const counterOffer = await ctx.prisma.offer.create({
          data: {
            productId: offer.productId,
            buyerId: offer.buyerId,
            sellerId: offer.sellerId,
            amount: input.counterAmount,
            round: offer.round + 1,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
          include: offerWithIncludes,
        })

        // Update original offer status to COUNTERED, link to counter-offer
        await ctx.prisma.offer.update({
          where: { id: input.id },
          data: {
            status: 'COUNTERED',
            counterOfferId: counterOffer.id,
          },
        })

        return counterOffer
      }

      // Handle ACCEPTED
      if (input.action === 'ACCEPTED') {
        const result = await ctx.prisma.$transaction(async (tx) => {
          // Update offer status
          const updated = await tx.offer.update({
            where: { id: input.id },
            data: { status: 'ACCEPTED' },
            include: offerWithIncludes,
          })

          // Create an Order record (basic, full order flow in Task 13)
          await tx.order.create({
            data: {
              buyerId: offer.buyerId,
              sellerId: offer.sellerId,
              productId: offer.productId,
              offerId: offer.id,
              amount: offer.amount,
              status: 'CREATED',
            },
          })

          // Mark product as SOLD
          await tx.product.update({
            where: { id: offer.productId },
            data: { status: 'SOLD' },
          })

          return updated
        })

        return result
      }

      // Handle REFUSED
      return ctx.prisma.offer.update({
        where: { id: input.id },
        data: { status: 'REFUSED' },
        include: offerWithIncludes,
      })
    }),

  /**
   * Buyer accepts or refuses a counter-offer made by the seller.
   * Accepting creates an Order record and marks product as SOLD.
   */
  acceptCounter: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        action: z.enum(['ACCEPTED', 'REFUSED']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.id },
        include: { product: true },
      })

      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Oferta nu a fost gasita',
        })
      }

      // Only the buyer can respond to counter-offers
      if (offer.buyerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar cumparatorul poate raspunde la aceasta contra-oferta',
        })
      }

      // Offer must be PENDING (a counter-offer is created as PENDING)
      if (offer.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contra-oferta nu mai este activa',
        })
      }

      // Check expiry
      if (offer.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contra-oferta a expirat',
        })
      }

      if (input.action === 'ACCEPTED') {
        const result = await ctx.prisma.$transaction(async (tx) => {
          const updated = await tx.offer.update({
            where: { id: input.id },
            data: { status: 'ACCEPTED' },
            include: offerWithIncludes,
          })

          // Create an Order record
          await tx.order.create({
            data: {
              buyerId: offer.buyerId,
              sellerId: offer.sellerId,
              productId: offer.productId,
              offerId: offer.id,
              amount: offer.amount,
              status: 'CREATED',
            },
          })

          // Mark product as SOLD
          await tx.product.update({
            where: { id: offer.productId },
            data: { status: 'SOLD' },
          })

          return updated
        })

        return result
      }

      // REFUSED
      return ctx.prisma.offer.update({
        where: { id: input.id },
        data: { status: 'REFUSED' },
        include: offerWithIncludes,
      })
    }),

  /**
   * Get all offers made by the current user (buyer perspective).
   */
  getMyOffers: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['PENDING', 'ACCEPTED', 'REFUSED', 'COUNTERED']).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const where: Record<string, unknown> = { buyerId: userId }
      if (input?.status) {
        where.status = input.status
      }

      return ctx.prisma.offer.findMany({
        where: where as any,
        include: offerWithIncludes,
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get all offers received by the current user (seller perspective).
   */
  getReceivedOffers: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['PENDING', 'ACCEPTED', 'REFUSED', 'COUNTERED']).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const where: Record<string, unknown> = { sellerId: userId }
      if (input?.status) {
        where.status = input.status
      }

      return ctx.prisma.offer.findMany({
        where: where as any,
        include: offerWithIncludes,
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get all offers for a specific product.
   */
  getByProduct: publicProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.offer.findMany({
        where: { productId: input.productId },
        include: offerWithIncludes,
        orderBy: { createdAt: 'desc' },
      })
    }),
})
