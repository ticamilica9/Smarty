import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
})

export type AppRouter = typeof appRouter
