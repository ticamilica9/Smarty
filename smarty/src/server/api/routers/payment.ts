import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../trpc"
import {
  createStripeAccount,
  createAccountLink,
  createPaymentIntent,
} from "@/server/stripe"

export const paymentRouter = router({
  /**
   * Create PaymentIntents for cart items.
   * Groups items by seller, creates Orders, then creates PaymentIntents
   * with manual capture for escrow.
   */
  createIntent: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.string().min(1),
            quantity: z.number().int().positive(),
            /** Optional amount override (e.g. for offer-based purchases) */
            amount: z.number().positive().optional(),
            /** If present, use the existing order created at offer acceptance */
            offerId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Offer-based checkout: use existing order from offer acceptance
      const offerItem = input.items[0]
      if (offerItem?.offerId) {
        // Find the existing order associated with this offer
        const existingOrder = await ctx.prisma.order.findFirst({
          where: {
            offerId: offerItem.offerId,
            buyerId: userId,
            status: "CREATED",
          },
          include: {
            product: { select: { title: true } },
            seller: { select: { stripeConnectId: true } },
          },
        })

        if (!existingOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comanda asociata ofertei nu a fost gasita",
          })
        }

        if (!existingOrder.seller.stripeConnectId) {
          return {
            payments: [
              {
                orderId: existingOrder.id,
                clientSecret: null,
                paymentIntentId: null,
                amount: existingOrder.amount,
                productTitle: existingOrder.product.title,
                error: "Vanzatorul nu are un cont Stripe conectat",
              },
            ],
          }
        }

        // Create PaymentIntent for the existing order
        const payment = await createPaymentIntent({
          amount: existingOrder.amount,
          stripeConnectId: existingOrder.seller.stripeConnectId,
          orderId: existingOrder.id,
          buyerId: userId,
        })

        return {
          payments: [
            {
              orderId: existingOrder.id,
              clientSecret: payment.clientSecret,
              paymentIntentId: payment.paymentIntentId,
              amount: existingOrder.amount,
              productTitle: existingOrder.product.title,
            },
          ],
        }
      }

      // Regular cart-based checkout: fetch all products with their sellers
      const products = await ctx.prisma.product.findMany({
        where: {
          id: { in: input.items.map((i) => i.productId) },
          status: "ACTIVE",
        },
        include: {
          seller: {
            select: { id: true, stripeConnectId: true, name: true },
          },
        },
      })

      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unele produse nu mai sunt disponibile",
        })
      }

      // Group items by seller
      const sellerGroups = new Map<
        string,
        {
          sellerId: string
          sellerName: string
          stripeConnectId: string | null
          items: { productId: string; quantity: number; price: number; title: string }[]
          total: number
        }
      >()

      for (const product of products) {
        const item = input.items.find((i) => i.productId === product.id)
        if (!item) continue

        const existing = sellerGroups.get(product.sellerId)
        // Use the provided amount override, otherwise fall back to product price
        const unitPrice = item.amount ?? product.price
        const lineTotal = unitPrice * item.quantity

        if (existing) {
          existing.items.push({
            productId: product.id,
            quantity: item.quantity,
            price: unitPrice,
            title: product.title,
          })
          existing.total += lineTotal
        } else {
          sellerGroups.set(product.sellerId, {
            sellerId: product.sellerId,
            sellerName: product.seller.name ?? "Vanzator",
            stripeConnectId: product.seller.stripeConnectId,
            items: [
              {
                productId: product.id,
                quantity: item.quantity,
                price: unitPrice,
                title: product.title,
              },
            ],
            total: lineTotal,
          })
        }
      }

      // Create orders and payment intents
      const results = []

      for (const [, group] of sellerGroups) {
        // Use transaction to create order + payment atomically
        const result = await ctx.prisma.$transaction(async (tx) => {
          // Create one order per seller containing all their items
          // For now we create one order per product (matching existing schema)
          // Actually the schema has Order.productId as a single product ref
          // So we create one order per product item
          const orders = []
          for (const item of group.items) {
            const order = await tx.order.create({
              data: {
                buyerId: userId,
                sellerId: group.sellerId,
                productId: item.productId,
                amount: item.price * item.quantity,
                status: "CREATED",
              },
              include: {
                product: {
                  select: { title: true },
                },
              },
            })
            orders.push(order)
          }

          return {
            sellerName: group.sellerName,
            sellerId: group.sellerId,
            total: group.total,
            hasStripeAccount: !!group.stripeConnectId,
            orders: orders.map((o) => ({
              orderId: o.id,
              productTitle: o.product.title,
              amount: o.amount,
            })),
          }
        })

        results.push(result)
      }

      // Now create Stripe PaymentIntents for sellers with Stripe accounts
      const paymentResults = []

      for (const result of results) {
        if (result.hasStripeAccount) {
          // Find the seller's stripeConnectId
          const seller = products.find((p) => p.sellerId === result.sellerId)?.seller
          const stripeConnectId = seller?.stripeConnectId

          if (stripeConnectId) {
            // Create one PaymentIntent per order for granular tracking
            for (const order of result.orders) {
              const payment = await createPaymentIntent({
                amount: order.amount,
                stripeConnectId,
                orderId: order.orderId,
                buyerId: userId,
              })

              paymentResults.push({
                orderId: order.orderId,
                clientSecret: payment.clientSecret,
                paymentIntentId: payment.paymentIntentId,
                amount: order.amount,
                productTitle: order.productTitle,
              })
            }
          }
        } else {
          // Seller hasn't connected Stripe yet
          // For now, we still create the order but mark it for later payment
          for (const order of result.orders) {
            paymentResults.push({
              orderId: order.orderId,
              clientSecret: null,
              paymentIntentId: null,
              amount: order.amount,
              productTitle: order.productTitle,
              error: "Vanzatorul nu are un cont Stripe conectat",
            })
          }
        }
      }

      return { payments: paymentResults }
    }),

  /**
   * Get or create a Stripe Connect onboarding link for the current user (seller).
   */
  getStripeConnectLink: protectedProcedure
    .input(
      z
        .object({
          refreshUrl: z.string().optional(),
          returnUrl: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, stripeConnectId: true },
      })

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizatorul nu a fost gasit" })
      }

      const refreshUrl =
        input?.refreshUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/cont/conectare-stripe`
      const returnUrl =
        input?.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/cont/plati`

      let accountId = user.stripeConnectId

      // If no Stripe account exists, create one
      if (!accountId) {
        const account = await createStripeAccount(userId, user.email ?? "")
        accountId = account.id
      }

      // Create an onboarding link
      const accountLink = await createAccountLink(accountId, refreshUrl, returnUrl)

      return { url: accountLink.url }
    }),
})
