"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ShoppingCartIcon,
  PackageIcon,
  MapPinIcon,
  CreditCardIcon,
  ArrowLeftIcon,
} from "lucide-react"

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

interface CheckoutFormProps {
  userId: string
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

export function CheckoutForm({ userId: _userId }: CheckoutFormProps) {
  const { items, totalItems, totalPrice } = useCart()
  const [formData, setFormData] = useState<FormData>({
    city: "",
    address: "",
    postalCode: "",
    phone: "",
    notes: "",
    shippingMethod: "courier",
  })
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // Stripe PaymentIntent integration will be added in Task 11.
    // For now, this is a placeholder.
    await new Promise((r) => setTimeout(r, 500))
    setSubmitting(false)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <ShoppingCartIcon className="size-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Cosul tau este gol</h2>
        <p className="text-muted-foreground">
          Adauga produse inainte de a finaliza comanda.
        </p>
        <Link href="/categorii">
          <Button>Vezi categorii</Button>
        </Link>
      </div>
    )
  }

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
              {/* Order items */}
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3"
                  >
                    <div className="relative aspect-square size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
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
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cantitate: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatRON(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({totalItems} {totalItems === 1 ? "produs" : "produse"})
                </span>
                <span className="font-medium tabular-nums">
                  {formatRON(totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transport</span>
                <span className="font-medium text-green-600 tabular-nums">
                  Gratuit
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatRON(totalPrice)}</span>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={submitting}
              >
                {submitting ? "Se proceseaza..." : "Plaseaza comanda"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Plata cu cardul va fi disponibila in curand
              </p>

              <Link href="/cos" className="w-full">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeftIcon className="size-4" />
                    Inapoi la cos
                  </Button>
                </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
