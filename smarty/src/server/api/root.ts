import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'
import { productRouter } from './routers/product'
import { offerRouter } from './routers/offer'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
})

export type AppRouter = typeof appRouter
