import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'
import { productRouter } from './routers/product'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
})

export type AppRouter = typeof appRouter
