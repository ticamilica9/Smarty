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
    </div>
  )
}
