import { router } from './trpc'
import { userRouter } from './routers/user'
import { categoryRouter } from './routers/category'
import { productRouter } from './routers/product'
import { offerRouter } from './routers/offer'
import { rfqRouter } from './routers/rfq'
import { paymentRouter } from './routers/payment'
import { shippingRouter } from './routers/shipping'
import { orderRouter } from './routers/order'
import { returnRouter } from './routers/return'
import { reviewRouter } from './routers/review'
import { adminRouter } from './routers/admin'

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  offer: offerRouter,
  rfq: rfqRouter,
  payment: paymentRouter,
  shipping: shippingRouter,
  order: orderRouter,
  return: returnRouter,
  review: reviewRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
