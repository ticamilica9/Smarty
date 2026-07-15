import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

const productWithIncludes = {
  seller: {
    select: { id: true, name: true, image: true, sellerRating: true },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  _count: { select: { wishlistItems: true, offers: true } },
} as const

const productCondition = z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'])
const productStatus = z.enum(['ACTIVE', 'SOLD', 'HIDDEN'])

export const productRouter = router({
  /**
   * Create a new product.
   */
  create: protectedProcedure
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
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id
      return ctx.prisma.product.create({
        data: {
          ...input,
          sellerId: userId,
        },
      })
    }),

  /**
   * Get a single product by ID with full details.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
        include: {
          ...productWithIncludes,
          seller: {
            select: {
              id: true,
              name: true,
              image: true,
              sellerRating: true,
              sellerProfile: {
                select: { id: true, storeName: true, description: true },
              },
            },
          },
        },
      })
      return product
    }),

  /**
   * Get all products for the current authenticated user.
   */
  getMyProducts: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user as { id: string }).id
    return ctx.prisma.product.findMany({
      where: { sellerId: userId },
      include: productWithIncludes,
      orderBy: { createdAt: 'desc' },
    })
  }),

  /**
   * Update a product. Only the owner can update.
   */
  update: protectedProcedure
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
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id
      const { id, ...data } = input

      const product = await ctx.prisma.product.findUnique({ where: { id } })
      if (!product || product.sellerId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return ctx.prisma.product.update({
        where: { id },
        data,
      })
    }),

  /**
   * Delete a product. Only the owner can delete.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const product = await ctx.prisma.product.findUnique({ where: { id: input.id } })
      if (!product || product.sellerId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return ctx.prisma.product.delete({ where: { id: input.id } })
    }),

  /**
   * Search products with filters and pagination.
   */
  search: publicProcedure
    .input(
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
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { status: 'ACTIVE' }

      if (input.query) {
        where.OR = [
          { title: { contains: input.query, mode: 'insensitive' } },
          { description: { contains: input.query, mode: 'insensitive' } },
        ]
      }
      if (input.categoryId) {
        where.categoryId = input.categoryId
      }
      if (input.condition) {
        where.condition = input.condition
      }
      if (input.minPrice !== undefined || input.maxPrice !== undefined) {
        const priceFilter: Record<string, number> = {}
        if (input.minPrice !== undefined) priceFilter.gte = input.minPrice
        if (input.maxPrice !== undefined) priceFilter.lte = input.maxPrice
        where.price = priceFilter
      }

      if (input.acceptTrade === true) {
        where.acceptTrade = true
      }

      let orderBy: Record<string, string>[]
      if (input.sortBy === 'price_asc') {
        orderBy = [{ price: 'asc' }]
      } else if (input.sortBy === 'price_desc') {
        orderBy = [{ price: 'desc' }]
      } else {
        orderBy = [{ createdAt: 'desc' }]
      }

      const [products, total] = await Promise.all([
        ctx.prisma.product.findMany({
          where: where as any,
          include: productWithIncludes,
          orderBy,
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.product.count({ where: where as any }),
      ])

      return { products, total }
    }),

  /**
   * Toggle a product in the user's wishlist.
   * If the item exists, it is removed. Otherwise, it is created.
   * Returns { added: boolean } — true if the item was added, false if removed.
   */
  toggleWishlist: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const existing = await ctx.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: input.productId,
          },
        },
      })

      if (existing) {
        await ctx.prisma.wishlistItem.delete({
          where: { id: existing.id },
        })
        return { added: false }
      }

      await ctx.prisma.wishlistItem.create({
        data: {
          userId,
          productId: input.productId,
        },
      })
      return { added: true }
    }),

  /**
   * Get all wishlist items for the current user with product details.
   */
  getWishlist: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user as { id: string }).id

    return ctx.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: productWithIncludes,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  /**
   * Check if a specific product is in the current user's wishlist.
   */
  isWishlisted: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const item = await ctx.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: input.productId,
          },
        },
      })

      return { isWishlisted: !!item }
    }),

  /**
   * Get the latest active products.
   */
  getLatest: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(12) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: productWithIncludes,
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 12,
      })
    }),
})
