"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ShoppingCartIcon,
  PackageIcon,
  MapPinIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  LockIcon,
} from "lucide-react"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/components/cart/cart-provider"
import { formatRON } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set")
}
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
)

interface CheckoutFormProps {
  userId: string
  productId?: string
  offerId?: string
}

type ShippingMethod = "courier" | "easybox"

interface FormData {
  city: string
  address: string
  postalCode: string
  phone: string
  notes: string
  shippingMethod: ShippingMethod
}

type CheckoutStep = "form" | "processing" | "payment" | "success" | "error"

interface PaymentInfo {
  orderId: string
  clientSecret: string | null
  paymentIntentId: string | null
  amount: number
  productTitle: string
  error?: string
}

/**
 * Inner payment form that uses Stripe Elements.
 * Handles confirming a single PaymentIntent (MVP: one-at-a-time).
 */
function PaymentForm({
  payment,
  onSuccess,
  onError,
}: {
  payment: PaymentInfo
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPaying, setIsPaying] = useState(false)

  const handlePay = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!stripe || !elements || !payment.clientSecret) return

      setIsPaying(true)

      const { error: submitError } = await elements.submit()
      if (submitError) {
        setIsPaying(false)
        onError(submitError.message ?? "Eroare la procesarea platii")
        return
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: payment.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
        },
        redirect: "if_required",
      })

      if (confirmError) {
        setIsPaying(false)
        onError(confirmError.message ?? "Plata a esuat")
        return
      }

      // Payment succeeded
      onSuccess()
    },
    [stripe, elements, payment, onSuccess, onError],
  )

  if (!payment.clientSecret) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {payment.error ?? "Nu exista plati de procesat"}
      </div>
    )
  }

  return (
    <form onSubmit={handlePay}>
      <div className="grid gap-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Comanda #{payment.orderId.slice(0, 8)}
              </p>
              <p className="text-sm font-medium">
                {payment.productTitle}
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {formatRON(payment.amount)}
            </p>
          </div>
        </div>

        <PaymentElement />

        {payment.error && (
          <p className="text-sm text-destructive">{payment.error}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockIcon className="size-3" />
          Plata este securizata de Stripe
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!stripe || !elements || isPaying}
        >
          {isPaying
            ? "Se proceseaza..."
            : `Plateste ${formatRON(payment.amount)}`}
        </Button>
      </div>
    </form>
  )
}

export function CheckoutForm({ userId: _userId, productId, offerId }: CheckoutFormProps) {
  const router = useRouter()
  const { items, totalItems, removeItem, clearCart } = useCart()
  const [step, setStep] = useState<CheckoutStep>("form")
  const [formData, setFormData] = useState<FormData>({
    city: "",
    address: "",
    postalCode: "",
    phone: "",
    notes: "",
    shippingMethod: "courier",
  })
  const [payments, setPayments] = useState<PaymentInfo[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createIntent = trpc.payment.createIntent.useMutation()

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Determine cart item to purchase (single-item MVP: take items[0])
  const cartItem = items.length > 0 ? items[0] : null

  const isOfferCheckout = !!(productId && offerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep("processing")
    setErrorMessage(null)

    try {
      if (isOfferCheckout) {
        // Offer-based checkout: use offerId to find existing order
        const result = await createIntent.mutateAsync({
          items: [
            {
              productId,
              quantity: 1,
              offerId,
            },
          ],
        })

        const validPayments = result.payments.filter(
          (p): p is typeof p & { clientSecret: string } => p.clientSecret !== null,
        )

        if (validPayments.length === 0) {
          setErrorMessage(
            result.payments[0]?.error ??
              "Nu s-a putut crea plata. Vanzatorul nu are un cont Stripe conectat.",
          )
          setStep("error")
          return
        }

        setPayments(validPayments)
        setStep("payment")
      } else if (cartItem) {
        // Regular cart checkout: use first item only (MVP single-item)
        const result = await createIntent.mutateAsync({
          items: [
            {
              productId: cartItem.productId,
              quantity: cartItem.quantity,
            },
          ],
        })

        const validPayments = result.payments.filter(
          (p): p is typeof p & { clientSecret: string } => p.clientSecret !== null,
        )

        if (validPayments.length === 0) {
          setErrorMessage(
            result.payments[0]?.error ??
              "Nu s-a putut crea plata. Vanzatorul nu are un cont Stripe conectat.",
          )
          setStep("error")
          return
        }

        setPayments(validPayments)
        setStep("payment")
      } else {
        setErrorMessage("Cosul tau este gol")
        setStep("error")
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "A aparut o eroare la procesarea comenzii"
      setErrorMessage(message)
      setStep("error")
    }
  }

  const handlePaymentSuccess = useCallback(() => {
    if (cartItem && !isOfferCheckout) {
      // Remove only the purchased item (not clear everything)
      removeItem(cartItem.productId)
    }
    setStep("success")
  }, [cartItem, isOfferCheckout, removeItem])

  const handlePaymentError = useCallback(
    (message: string) => {
      setErrorMessage(message)
      setStep("error")
    },
    [],
  )

  // Find the client secret for the Elements provider
  const activePayment = payments[0]

  // Empty cart state (only for non-offer checkout)
  if (!isOfferCheckout && items.length === 0 && step !== "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <ShoppingCartIcon className="size-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Cosul gol</h2>
        <p className="text-muted-foreground">
          Adauga produse inainte de a finaliza comanda.
        </p>
        <Link href="/categorii">
          <Button>Vezi categorii</Button>
        </Link>
      </div>
    )
  }

  // Success state
  if (step === "success") {
    const orderId = activePayment?.orderId
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircleIcon className="size-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Comanda a fost plasata!</h2>
        <p className="max-w-md text-muted-foreground">
          Plata a fost procesata cu succes. Vanzatorul va fi notificat si va
          procesa comanda in curand.
        </p>
        <div className="flex gap-3">
          {orderId ? (
            <Link href={`/comenzi/${orderId}`}>
              <Button>Vezi comanda</Button>
            </Link>
          ) : (
            <Link href="/cont/comenzi">
              <Button>Vezi comenzile mele</Button>
            </Link>
          )}
          <Link href="/categorii">
            <Button variant="outline">Continua cumparaturile</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Error state
  if (step === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <ShoppingCartIcon className="size-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Eroare la procesare</h2>
        <p className="max-w-md text-muted-foreground">
          {errorMessage ?? "A aparut o eroare neasteptata. Te rugam sa incerci din nou."}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setStep("form")}>Incearca din nou</Button>
          {!isOfferCheckout && (
            <Link href="/cos">
              <Button variant="outline">Inapoi la cos</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Payment step
  if (step === "payment" && activePayment?.clientSecret) {
    const elementsOptions: StripeElementsOptions = {
      clientSecret: activePayment.clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#18181b",
        },
      },
    }

    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="size-4" />
              Plata cu cardul
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={elementsOptions}
            >
              <PaymentForm
                payment={activePayment}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Processing step
  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">
          Se proceseaza comanda...
        </p>
      </div>
    )
  }

  // Form step (default)
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column: form fields */}
        <div className="flex flex-col gap-6">
          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="size-4" />
                Adresa de livrare
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="city">Orasul</Label>
                  <Input
                    id="city"
                    placeholder="Ex: Bucuresti"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="postalCode">Cod postal</Label>
                  <Input
                    id="postalCode"
                    placeholder="Ex: 010101"
                    value={formData.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="address">Adresa</Label>
                <Textarea
                  id="address"
                  placeholder="Strada, numar, bloc, apartament..."
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ex: 07XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Shipping method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="size-4" />
                Metoda de livrare
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  formData.shippingMethod === "courier"
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="shippingMethod"
                  value="courier"
                  checked={formData.shippingMethod === "courier"}
                  onChange={() => updateField("shippingMethod", "courier")}
                  className="mt-1"
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">Curier standard</span>
                  <span className="text-xs text-muted-foreground">
                    Livrare la adresa ta in 2-4 zile lucratoare
                  </span>
                  <span className="text-sm font-semibold">Gratuit</span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  formData.shippingMethod === "easybox"
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="shippingMethod"
                  value="easybox"
                  checked={formData.shippingMethod === "easybox"}
                  onChange={() => updateField("shippingMethod", "easybox")}
                  className="mt-1"
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">Easybox</span>
                  <span className="text-xs text-muted-foreground">
                    Colectare din locker in 1-2 zile lucratoare
                  </span>
                  <span className="text-sm font-semibold">Gratuit</span>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Order notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Note (optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Orice informatie suplimentara pentru vanzator..."
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: order summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="size-4" />
                Rezumat comanda
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {/* Order items — show single item only (MVP) */}
              <div className="flex flex-col gap-2">
                {isOfferCheckout ? (
                  /* Offer-based: show a placeholder; actual title comes from the server */
                  <div className="flex items-center gap-3">
                    <div className="relative flex aspect-square size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      <ShoppingCartIcon className="size-5 text-muted-foreground/40" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm font-medium">
                        Comanda oferta
                      </p>
                    </div>
                  </div>
                ) : cartItem ? (
                  <div
                    key={cartItem.productId}
                    className="flex items-center gap-3"
                  >
                    <div className="relative aspect-square size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {cartItem.image ? (
                        <Image
                          src={cartItem.image}
                          alt={cartItem.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground/40">
                          <ShoppingCartIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm font-medium">
                        {cartItem.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cantitate: {cartItem.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatRON(cartItem.price * cartItem.quantity)}
                    </p>
                  </div>
                ) : null}
              </div>

              <Separator />

              {isOfferCheckout ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium tabular-nums">
                    Conform ofertei
                  </span>
                </div>
              ) : cartItem ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({totalItems}{" "}
                      {totalItems === 1 ? "produs" : "produse"})
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatRON(cartItem.price * cartItem.quantity)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport</span>
                    <span className="font-medium text-green-600 tabular-nums">
                      Gratuit
                    </span>
                  </div>
                </>
              ) : null}

              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                {isOfferCheckout ? (
                  <span className="tabular-nums">Conform ofertei</span>
                ) : cartItem ? (
                  <span className="tabular-nums">
                    {formatRON(cartItem.price * cartItem.quantity)}
                  </span>
                ) : (
                  <span className="tabular-nums">0 RON</span>
                )}
              </div>

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={createIntent.isPending || (!cartItem && !isOfferCheckout)}
              >
                {createIntent.isPending
                  ? "Se proceseaza..."
                  : "Plaseaza comanda"}
              </Button>

              {errorMessage && (
                <p className="text-center text-xs text-destructive">
                  {errorMessage}
                </p>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Plata securizata prin Stripe
              </p>

              {!isOfferCheckout && (
                <Link href="/cos" className="w-full">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeftIcon className="size-4" />
                    Inapoi la cos
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
