import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
})

/**
 * Create a Stripe Express connected account for a seller.
 * Updates the user record with the new stripeConnectId.
 */
export async function createStripeAccount(userId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    country: "RO",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectId: account.id },
  })

  return account
}

/**
 * Create an onboarding link for a Stripe Express account.
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })
}

/**
 * Create a PaymentIntent with escrow (manual capture).
 * Funds are held until releaseEscrow is called.
 * Platform fee: 10% (application_fee_amount).
 */
export async function createPaymentIntent(params: {
  amount: number // in RON (e.g., 100 = 100 RON)
  stripeConnectId: string // seller's connected account id
  orderId: string
  buyerId: string
}) {
  const { amount, stripeConnectId, orderId, buyerId: _buyerId } = params

  const amountBani = Math.round(amount * 100) // convert to bani (cents equivalent)
  const applicationFee = Math.round(amountBani * 0.1) // 10% platform fee

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountBani,
    currency: "ron",
    capture_method: "manual",
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: stripeConnectId,
    },
    metadata: {
      orderId,
    },
  })

  // Create payment record in database
  await prisma.payment.create({
    data: {
      orderId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      status: "HELD",
    },
  })

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }
}

/**
 * Release escrow: capture the PaymentIntent.
 * Called after buyer confirms delivery.
 */
export async function releaseEscrow(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)

  // Update payment status in database
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: {
      status: "RELEASED",
      escrowReleasedAt: new Date(),
    },
  })

  return paymentIntent
}

/**
 * Refund a PaymentIntent (full refund).
 */
export async function refundPayment(paymentIntentId: string) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  })

  // Update payment status in database
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "REFUNDED" },
  })

  return refund
}
