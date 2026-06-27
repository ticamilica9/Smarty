import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import superjson from 'superjson'
import { auth } from '@/server/auth'
import { prisma } from '@/lib/prisma'

export const createTRPCContext = async () => {
  const session = await auth()
  return { session, prisma }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user as typeof ctx.session.user & { role?: string } } })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

const enforceAdmin = t.middleware(({ ctx, next }) => {
  const role = (ctx.session?.user as Record<string, unknown> | undefined)?.role
  if (!ctx.session?.user || role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user as typeof ctx.session.user & { role?: string } } })
})

export const adminProcedure = t.procedure.use(enforceAuth).use(enforceAdmin)
