import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { sendNotification } from '@/server/sse'

const rfqWithIncludes = {
  id: true,
  buyerId: true,
  title: true,
  description: true,
  categoryId: true,
  maxBudget: true,
  expiresAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  buyer: {
    select: { id: true, name: true, image: true, sellerRating: true },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  _count: { select: { offers: true } },
} as const

const rfqOfferWithIncludes = {
  id: true,
  rfqId: true,
  sellerId: true,
  productId: true,
  amount: true,
  message: true,
  status: true,
  createdAt: true,
  seller: {
    select: { id: true, name: true, image: true, sellerRating: true },
  },
  product: {
    select: { id: true, title: true, images: true, status: true },
  },
} as const

const rfqDetailIncludes = {
  id: true,
  buyerId: true,
  title: true,
  description: true,
  categoryId: true,
  maxBudget: true,
  expiresAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  buyer: {
    select: { id: true, name: true, image: true, sellerRating: true },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  _count: { select: { offers: true } },
  offers: {
    include: {
      id: true,
      rfqId: true,
      sellerId: true,
      productId: true,
      amount: true,
      message: true,
      status: true,
      createdAt: true,
      seller: {
        select: { id: true, name: true, image: true, sellerRating: true },
      },
      product: {
        select: { id: true, title: true, images: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

export const rfqRouter = router({
  /**
   * Create a new RFQ (Request for Quote).
   * The RFQ expires after 7 days by default.
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Titlul este obligatoriu'),
        description: z.string().min(1, 'Descrierea este obligatorie'),
        categoryId: z.string().min(1, 'Categoria este obligatorie'),
        maxBudget: z.number().positive('Bugetul trebuie sa fie mai mare decat 0'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      return ctx.prisma.rFQ.create({
        data: {
          buyerId: userId,
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          maxBudget: input.maxBudget,
          expiresAt,
          status: 'OPEN',
        },
        include: rfqWithIncludes,
      })
    }),

  /**
   * Get all OPEN RFQs. Optionally filter by category.
   */
  getAll: publicProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        status: 'OPEN',
        expiresAt: { gt: new Date() },
      }

      if (input?.categoryId) {
        where.categoryId = input.categoryId
      }

      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      const [rfqs, total] = await Promise.all([
        ctx.prisma.rFQ.findMany({
          where: where as any,
          include: rfqWithIncludes,
          orderBy: { createdAt: 'desc' },
          take: input?.limit ?? 20,
          skip: input?.offset ?? 0,
        }),
        ctx.prisma.rFQ.count({ where: where as any }),
      ])

      return { rfqs, total }
    }),

  /**
   * Get a single RFQ by ID with all offers.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rfq = await ctx.prisma.rFQ.findUnique({
        where: { id: input.id },
        include: rfqDetailIncludes,
      })

      if (!rfq) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cererea nu a fost gasita',
        })
      }

      return rfq
    }),

  /**
   * Get all RFQs for the current user (as buyer).
   */
  getMyRFQs: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['OPEN', 'CLOSED', 'AWARDED']).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const where: Record<string, unknown> = { buyerId: userId }
      if (input?.status) {
        where.status = input.status
      }

      return ctx.prisma.rFQ.findMany({
        where: where as any,
        include: {
          ...rfqWithIncludes,
          offers: {
            include: rfqOfferWithIncludes,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Submit an offer on an RFQ (seller perspective).
   * Rules:
   * - Cannot offer on own RFQ
   * - Offer amount must not exceed maxBudget
   * - RFQ must be OPEN and not expired
   */
  offer: protectedProcedure
    .input(
      z.object({
        rfqId: z.string().min(1),
        amount: z.number().positive('Oferta trebuie sa fie mai mare decat 0'),
        message: z.string().optional(),
        productId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch the RFQ
      const rfq = await ctx.prisma.rFQ.findUnique({
        where: { id: input.rfqId },
      })

      if (!rfq) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cererea nu a fost gasita',
        })
      }

      // Cannot offer on own RFQ
      if (rfq.buyerId === userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nu poti face o oferta pentru propria cerere',
        })
      }

      // RFQ must be OPEN
      if (rfq.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aceasta cerere nu mai este deschisa',
        })
      }

      // RFQ must not be expired
      if (rfq.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aceasta cerere a expirat',
        })
      }

      // Offer must not exceed max budget
      if (input.amount > rfq.maxBudget) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Oferta nu poate depasi bugetul maxim de ${rfq.maxBudget.toFixed(2)} RON`,
        })
      }

      // Check if seller already has a pending offer on this RFQ
      const existingOffer = await ctx.prisma.rFQOffer.findFirst({
        where: {
          rfqId: input.rfqId,
          sellerId: userId,
          status: 'PENDING',
        },
      })

      if (existingOffer) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ai deja o oferta activa pentru aceasta cerere',
        })
      }

      // If productId provided, verify it exists and belongs to the seller
      if (input.productId) {
        const product = await ctx.prisma.product.findUnique({
          where: { id: input.productId },
        })

        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Produsul nu a fost gasit',
          })
        }

        if (product.sellerId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Produsul nu iti apartine',
          })
        }
      }

      return ctx.prisma.rFQOffer.create({
        data: {
          rfqId: input.rfqId,
          sellerId: userId,
          amount: input.amount,
          message: input.message ?? null,
          productId: input.productId ?? null,
          status: 'PENDING',
        },
        include: rfqOfferWithIncludes,
      }).then(async (offer) => {
        // Notify the buyer in real time
        sendNotification(rfq.buyerId, {
          type: 'RFQ_OFFER_RECEIVED',
          title: 'Oferta la cererea ta',
          message: `Ai primit o oferta de ${input.amount.toFixed(2)} RON pentru "${rfq.title}"`,
          link: `/cereri/${input.rfqId}`,
          metadata: { rfqId: input.rfqId, offerId: offer.id },
        }).catch(() => {
          /* fire-and-forget: notification failure must not break the mutation */
        })

        return offer
      })
    }),

  /**
   * Buyer accepts an offer on their RFQ.
   * This closes the RFQ (status AWARDED), rejects all other pending offers,
   * and creates an Order record.
   */
  accept: protectedProcedure
    .input(
      z.object({
        rfqId: z.string().min(1),
        offerId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch the RFQ
      const rfq = await ctx.prisma.rFQ.findUnique({
        where: { id: input.rfqId },
      })

      if (!rfq) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cererea nu a fost gasita',
        })
      }

      // Only the buyer who created the RFQ can accept
      if (rfq.buyerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Doar cumparatorul poate accepta o oferta',
        })
      }

      // RFQ must be OPEN
      if (rfq.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aceasta cerere nu mai este deschisa',
        })
      }

      // Fetch the offer
      const offer = await ctx.prisma.rFQOffer.findUnique({
        where: { id: input.offerId },
      })

      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Oferta nu a fost gasita',
        })
      }

      if (offer.rfqId !== input.rfqId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Oferta nu apartine acestei cereri',
        })
      }

      if (offer.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Oferta nu mai este activa',
        })
      }

      // Execute in transaction: accept the winning offer, reject others, create order
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Accept the winning offer
        const acceptedOffer = await tx.rFQOffer.update({
          where: { id: input.offerId },
          data: { status: 'ACCEPTED' },
          include: rfqOfferWithIncludes,
        })

        // Reject all other pending offers on this RFQ
        await tx.rFQOffer.updateMany({
          where: {
            rfqId: input.rfqId,
            id: { not: input.offerId },
            status: 'PENDING',
          },
          data: { status: 'REFUSED' },
        })

        // Update RFQ status to AWARDED
        await tx.rFQ.update({
          where: { id: input.rfqId },
          data: { status: 'AWARDED' },
        })

        // Create an Order record
        // If the offer has a productId, use that product's sellerId as seller
        // Otherwise use the offer's sellerId
        const sellerId = offer.sellerId

        // Determine the product to link — if productId provided on offer, use it
        // Otherwise we need to handle differently since Order requires a productId
        // Create a minimal product reference or use the one from the offer
        let orderProductId = offer.productId

        // If no productId was given in the offer, we still need a product for the order schema
        // In a full implementation this would be handled differently, but for now
        // we'll use a placeholder approach or require productId on offer
        if (!orderProductId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Oferta trebuie sa includa un produs pentru a crea comanda',
          })
        }

        await tx.order.create({
          data: {
            buyerId: rfq.buyerId,
            sellerId: sellerId,
            productId: orderProductId,
            rfqOfferId: offer.id,
            amount: offer.amount,
            status: 'CREATED',
          },
        })

        return acceptedOffer
      })

      return result
    }),
})
