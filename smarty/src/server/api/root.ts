import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'
import { productRouter } from './routers/product'
import { offerRouter } from './routers/offer'
import { rfqRouter } from './routers/rfq'
import { paymentRouter } from './routers/payment'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
  rfq: rfqRouter,
  payment: paymentRouter,
})

export type AppRouter = typeof appRouter
