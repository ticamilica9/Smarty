import { NextResponse } from "next/server"
import { stripe } from "@/server/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        const orderId = paymentIntent.metadata?.orderId

        if (!orderId) {
          console.warn("Webhook payment_intent.succeeded: missing orderId metadata")
          break
        }

        // With manual capture, this fires at authorization — funds are HELD, not released
        await prisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: {
            status: "HELD",
          },
        })

        // Update order status to PAID
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "PAID" },
        })

        console.log(`Payment held for order ${orderId}`)
        break
      }

      case "payment_intent.payment_failed": {
        const failedIntent = event.data.object
        const failedOrderId = failedIntent.metadata?.orderId

        if (failedOrderId) {
          await prisma.payment.update({
            where: { stripePaymentIntentId: failedIntent.id },
            data: { status: "REFUNDED" },
          })
        }

        console.error(`Payment failed for intent ${failedIntent.id}`)
        break
      }

      case "account.updated": {
        const account = event.data.object
        const stripeConnectId = account.id

        const user = await prisma.user.findFirst({
          where: { stripeConnectId },
        })

        if (!user) {
          console.warn(`Webhook account.updated: no user found for account ${stripeConnectId}`)
          break
        }

        // Check if payouts are enabled
        const payoutsEnabled = account.payouts_enabled
        console.log(
          `Account ${stripeConnectId} updated, payouts_enabled: ${payoutsEnabled}`,
        )
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
