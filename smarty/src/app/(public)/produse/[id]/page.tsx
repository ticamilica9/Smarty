'use client'

import { useState } from 'react'
import { useParams, notFound, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Heart,
  MessageSquare,
  AlertCircle,
  User,
  Loader2,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc/client'
import { formatRON, conditionLabel } from '@/lib/utils'
import { useCart } from '@/components/cart/cart-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: session } = useSession()
  const utils = trpc.useUtils()
  const { addItem } = useCart()
  const { data: product, isLoading } = trpc.product.getById.useQuery({ id })
  const [selectedImage, setSelectedImage] = useState(0)

  // Offer dialog state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')

  // Trade dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false)
  const [tradeDescription, setTradeDescription] = useState('')
  const [tradeMoneyDiff, setTradeMoneyDiff] = useState('')

  // Offer create mutation
  const createOffer = trpc.offer.create.useMutation({
    onSuccess: () => {
      toast.success('Oferta ta a fost trimisa cu succes!')
      setOfferDialogOpen(false)
      setOfferAmount('')
      utils.offer.getMyOffers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Trade offer mutation
  const createTradeOffer = trpc.offer.create.useMutation({
    onSuccess: () => {
      toast.success('Propunerea ta de schimb a fost trimisa!')
      setTradeDialogOpen(false)
      setTradeDescription('')
      setTradeMoneyDiff('')
      utils.offer.getMyOffers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="size-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Not found
  if (!product) {
    notFound()
  }

  const images = product.images.length > 0 ? product.images : ['']
  const isOwner = session?.user?.id === product.sellerId
  const isActive = product.status === 'ACTIVE'

  const cartItem = {
    productId: product.id,
    title: product.title,
    price: product.price,
    image: product.images[0] || '',
    sellerId: product.sellerId,
    sellerName: product.seller.name ?? 'Vanzator',
  }

  const handleAddToCart = () => {
    addItem(cartItem)
    toast.success('Produsul a fost adaugat in cos')
  }

  const handleBuyNow = () => {
    addItem(cartItem)
    router.push('/checkout')
  }

  const handleSubmitOffer = () => {
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introdu o suma valida')
      return
    }
    if (amount >= product.price) {
      toast.error('Oferta trebuie sa fie mai mica decat pretul afisat')
      return
    }
    createOffer.mutate({ productId: product.id, amount })
  }

  const handleSubmitTrade = () => {
    if (!tradeDescription.trim()) {
      toast.error('Descrie ce oferi la schimb')
      return
    }
    createTradeOffer.mutate({
      productId: product.id,
      type: 'TRADE',
      tradeDescription: tradeDescription.trim(),
      moneyDifference: tradeMoneyDiff ? parseFloat(tradeMoneyDiff) : undefined,
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column - Image gallery */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {images[selectedImage] ? (
              <Image
                src={images[selectedImage]}
                alt={product.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/40">
                <AlertCircle className="size-16" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((url: any, i: any) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`relative size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === selectedImage
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  {url ? (
                    <Image
                      src={url}
                      alt={`${product.title} - imaginea ${i + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column - Product info */}
        <div className="flex flex-col gap-6">
          {/* Title & badges */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {product.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Adauga la favorite"
              >
                <Heart className="size-5" />
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{conditionLabel(product.condition)}</Badge>
              {!isActive && (
                <Badge variant="destructive">
                  {product.status === 'SOLD' ? 'Vandut' : 'Ascuns'}
                </Badge>
              )}
              {product.category && (
                <Link
                  href={`/categorii/${product.category.slug}`}
                  className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              )}
            </div>
          </div>

          {/* Price */}
          <p className="text-3xl font-bold text-primary">
            {formatRON(product.price)}
          </p>

          <Separator />

          {/* Product details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {product.brand && (
              <>
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{product.brand}</span>
              </>
            )}
            {product.shade && (
              <>
                <span className="text-muted-foreground">Nuanta</span>
                <span className="font-medium">{product.shade}</span>
              </>
            )}
            {product.skinType && (
              <>
                <span className="text-muted-foreground">Tip tenie</span>
                <span className="font-medium">{product.skinType}</span>
              </>
            )}
            <span className="text-muted-foreground">Data publicarii</span>
            <span className="font-medium">
              {new Date(product.createdAt).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Descriere
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {product.description}
            </p>
          </div>

          {/* Trade info */}
          {product.acceptTrade && (
            <>
              <Separator />
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔄</span>
                  <h3 className="text-sm font-semibold text-green-900">
                    Vanzatorul accepta schimb
                  </h3>
                </div>

                {product.tradeInterests && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-800 mb-1">
                      Ce il intereseaza:
                    </p>
                    <p className="text-sm text-green-700">
                      {product.tradeInterests}
                    </p>
                  </div>
                )}

                <div className="mb-3">
                  {product.acceptMoneyDifference ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      ✅ Accepta diferenta de bani
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      ❌ Nu accepta diferenta de bani
                    </Badge>
                  )}
                </div>

                {!isOwner && session?.user && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-300 text-green-800 hover:bg-green-100 hover:text-green-900"
                    onClick={() => setTradeDialogOpen(true)}
                    disabled={createTradeOffer.isPending}
                  >
                    {createTradeOffer.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <span className="text-lg mr-1">🔄</span>
                    )}
                    Propune un schimb
                  </Button>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Seller info */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              {product.seller.image ? (
                <Image
                  src={product.seller.image}
                  alt={product.seller.name ?? 'Vanzator'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Link
                href={`/vanzator/${product.seller.id}`}
                className="text-sm font-medium hover:underline"
              >
                {product.seller.name ?? 'Vanzator'}
              </Link>
              {product.seller.sellerProfile?.storeName && (
                <p className="text-xs text-muted-foreground">
                  {product.seller.sellerProfile.storeName}
                </p>
              )}
            </div>
            {product.seller.sellerRating > 0 && (
              <Badge variant="secondary" className="text-xs">
                ★ {product.seller.sellerRating.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          {isActive && !isOwner && session?.user && (
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleBuyNow}
                disabled={createOffer.isPending}
              >
                Cumpara acum
              </Button>
              <Button
                size="lg"
                className="w-full"
                variant="secondary"
                onClick={handleAddToCart}
                disabled={createOffer.isPending}
              >
                <ShoppingCart className="size-4" />
                Adauga in cos
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setOfferDialogOpen(true)}
                disabled={createOffer.isPending}
              >
                {createOffer.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
                Trimite oferta
              </Button>
            </div>
          )}

          {!session?.user && isActive && (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Autentifica-te pentru a cumpara
              </Link>
            </div>
          )}

          {isOwner && (
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="lg" className="w-full" disabled>
                Acesta este anuntul tau
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Wishlist count */}
      {(product._count?.wishlistItems ?? 0) > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {(product._count?.wishlistItems ?? 0)} persoana
          {(product._count?.wishlistItems ?? 0) !== 1 ? 'e' : ''} salveaza acest produs
        </p>
      )}

      {/* Offer dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimite oferta</DialogTitle>
            <DialogDescription>
              Propune un pret pentru <strong>{product.title}</strong>.
              Pretul afisat: {formatRON(product.price)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="offer-amount">
              Suma ta (RON) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="offer-amount"
              type="number"
              min={0.01}
              step={0.01}
              max={product.price - 0.01}
              placeholder="ex: 50"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Oferta trebuie sa fie mai mica decat pretul afisat ({formatRON(product.price)})
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOfferDialogOpen(false)
                setOfferAmount('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={!offerAmount || createOffer.isPending}
            >
              {createOffer.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Trimite oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade proposal dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propune un schimb</DialogTitle>
            <DialogDescription>
              Descrie ce produs oferi la schimb pentru <strong>{product.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-description">
                Ce oferi la schimb? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="trade-description"
                placeholder="Ex: Iti ofer la schimb un ruj Dior nuanta 999, folosit o singura data..."
                rows={3}
                value={tradeDescription}
                onChange={(e) => setTradeDescription(e.target.value)}
              />
            </div>

            {product.acceptMoneyDifference && (
              <div className="space-y-2">
                <Label htmlFor="trade-money-diff">
                  Diferenta de bani (RON)
                </Label>
                <Input
                  id="trade-money-diff"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50 (suma pe care o oferi in plus)"
                  value={tradeMoneyDiff}
                  onChange={(e) => setTradeMoneyDiff(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — lasa gol daca propui un schimb fara diferenta de bani.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTradeDialogOpen(false)
                setTradeDescription('')
                setTradeMoneyDiff('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitTrade}
              disabled={!tradeDescription.trim() || createTradeOffer.isPending}
            >
              {createTradeOffer.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Trimite propunerea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
