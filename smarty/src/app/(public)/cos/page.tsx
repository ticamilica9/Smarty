"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ShoppingCartIcon,
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/components/cart/cart-provider"
import { formatRON } from "@/lib/utils"

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } =
    useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <ShoppingCartIcon className="size-16 text-muted-foreground/40" />
        <h1 className="text-2xl font-semibold">Cosul tau este gol</h1>
        <p className="text-muted-foreground">
          Adauga produse pentru a incepe cumparaturile.
        </p>
        <Link href="/categorii">
          <Button>Vezi categorii</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Cosul tau ({totalItems} {totalItems === 1 ? "produs" : "produse"})
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          <Trash2Icon className="size-4" />
          Goleste cosul
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Cart items */}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.productId}>
              <CardContent className="flex gap-4 px-4 py-4">
                {/* Image */}
                <div className="relative aspect-square size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <ShoppingCartIcon className="size-8" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/produse/${item.productId}`}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Vanzator: {item.sellerName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Sterge produsul"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Scade cantitatea"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        <MinusIcon className="size-3" />
                      </Button>
                      <span className="flex h-8 w-10 items-center justify-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Creste cantitatea"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    </div>

                    <p className="text-sm font-semibold">
                      {formatRON(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Rezumat comanda</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
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
                <span className="text-muted-foreground">Calculat la finalizare</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatRON(totalPrice)}</span>
              </div>
              <Link href="/checkout" className="mt-2 w-full">
                  <Button className="w-full">
                    Finalizeaza comanda
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </Link>
                <Link href="/categorii" className="w-full">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeftIcon className="size-4" />
                    Continua cumparaturile
                  </Button>
                </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
