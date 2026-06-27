import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const categoryRouter = router({
  /** Get all categories, optionally filtered by parentId (null = roots). */
  getAll: publicProcedure
    .input(
      z
        .object({
          parentId: z.string().nullable().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.parentId !== undefined ? { parentId: input.parentId } : {}
      return ctx.prisma.productCategory.findMany({
        where,
        include: {
          _count: { select: { children: true, products: true } },
        },
        orderBy: { name: 'asc' },
      })
    }),

  /** Get a single category by slug, including children and parent. */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.productCategory.findUnique({
        where: { slug: input.slug },
        include: {
          parent: true,
          children: {
            include: {
              _count: { select: { products: true } },
            },
            orderBy: { name: 'asc' },
          },
          _count: { select: { products: true, children: true } },
        },
      })

      if (!category) return null

      return category
    }),

  /** Get ancestor chain from root to this category (for breadcrumbs). */
  getAncestors: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.productCategory.findUnique({
        where: { slug: input.slug },
      })

      if (!category) return []

      const ancestors: { id: string; name: string; slug: string }[] = []
      let current = category

      while (current.parentId) {
        const parent = await ctx.prisma.productCategory.findUnique({
          where: { id: current.parentId },
          select: { id: true, name: true, slug: true, parentId: true },
        })

        if (!parent) break

        ancestors.unshift({ id: parent.id, name: parent.name, slug: parent.slug })
        current = parent as typeof current
      }

      return ancestors
    }),
})
