import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

const userWithId = <T>(user: T) => user as T & { id: string }

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
        where: { id: userWithId(ctx.user).id },
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
        where: { id: userWithId(ctx.user).id },
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
        data: {
          storeName: input.storeName,
          description: input.description,
          returnPolicy: input.returnPolicy,
          userId: userWithId(ctx.user).id,
        },
      })
    }),

  getSellerProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.sellerProfile.findUnique({
        where: { userId: input.userId },
        include: {
          user: {
            select: { id: true, name: true, image: true, sellerRating: true },
          },
        },
      })

      if (profile) {
        const activeProductCount = await ctx.prisma.product.count({
          where: { sellerId: input.userId, status: 'ACTIVE' },
        })
        return { ...profile, _count: { activeProducts: activeProductCount } }
      }

      return profile
    }),
})
