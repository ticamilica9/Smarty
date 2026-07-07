import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { isPreviewMode } from "@/lib/preview-mode"

// ── Stripe client (lazy, preview-aware) ──

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  if (isPreviewMode()) {
    // Return a minimal Stripe-like object for preview — the actual
    // Stripe SDK is never called because all exported functions below
    // short-circuit in preview mode.
    _stripe = {} as Stripe
    return _stripe
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  })
  return _stripe
}

// Legacy alias for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return (getStripe() as any)[prop] }
})

// ── Stripe Connect ──

export async function createStripeAccount(userId: string, email: string) {
  if (isPreviewMode()) {
    const mockId = `acct_preview_${userId}`
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectId: mockId },
    })
    return { id: mockId }
  }
  const account = await getStripe().accounts.create({
    type: "express",
    country: "RO",
    email,
    capabilities: { transfers: { requested: true } },
    business_type: "individual",
  })
  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectId: account.id },
  })
  return account
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
) {
  if (isPreviewMode()) {
    return { url: returnUrl }
  }
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })
}

// ── Payments ──

export async function createPaymentIntent(params: {
  amount: number
  stripeConnectId: string
  orderId: string
  buyerId: string
}) {
  const { amount, stripeConnectId, orderId } = params

  if (isPreviewMode()) {
    const mockId = `pi_preview_${orderId}`
    await prisma.payment.create({
      data: {
        orderId,
        stripePaymentIntentId: mockId,
        amount,
        status: "HELD",
      },
    })
    return {
      clientSecret: `${mockId}_secret_preview`,
      paymentIntentId: mockId,
    }
  }

  const amountBani = Math.round(amount * 100)
  const applicationFee = Math.round(amountBani * 0.1)

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountBani,
    currency: "ron",
    capture_method: "manual",
    application_fee_amount: applicationFee,
    transfer_data: { destination: stripeConnectId },
    metadata: { orderId },
  })

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

export async function releaseEscrow(paymentIntentId: string) {
  if (isPreviewMode()) {
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: "RELEASED", escrowReleasedAt: new Date() },
    })
    return { id: paymentIntentId }
  }
  const paymentIntent = await getStripe().paymentIntents.capture(paymentIntentId)
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "RELEASED", escrowReleasedAt: new Date() },
  })
  return paymentIntent
}

export async function refundPayment(paymentIntentId: string) {
  if (isPreviewMode()) {
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: "REFUNDED" },
    })
    return { id: `refund_${paymentIntentId}` }
  }
  const refund = await getStripe().refunds.create({
    payment_intent: paymentIntentId,
  })
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "REFUNDED" },
  })
  return refund
}
