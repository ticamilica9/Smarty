import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../trpc"
import {
  stripe,
  createStripeAccount,
  createAccountLink,
  createPaymentIntent,
  releaseEscrow,
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
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch all products with their sellers
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
        const lineTotal = product.price * item.quantity

        if (existing) {
          existing.items.push({
            productId: product.id,
            quantity: item.quantity,
            price: product.price,
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
                price: product.price,
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
   * Confirm delivery and release escrow funds to seller.
   * Called by the buyer after receiving the item.
   */
  confirm: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch the order and verify it belongs to the current user
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.buyerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Aceasta comanda nu iti apartine",
        })
      }

      if (order.status !== "PAID" && order.status !== "CREATED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Comanda nu poate fi confirmata",
        })
      }

      if (!order.payment?.stripePaymentIntentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nu exista o plata pentru aceasta comanda",
        })
      }

      if (order.payment.status !== "HELD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plata nu mai este in escrow",
        })
      }

      // Release escrow: capture the PaymentIntent
      await releaseEscrow(order.payment.stripePaymentIntentId)

      // Update order status
      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: "DELIVERED" },
      })

      return { success: true }
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
