'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, AlertCircle, ShoppingBag, Trash2 } from 'lucide-react'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function WishlistCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-4">
        <Skeleton className="size-16 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5" />
        </div>
      </CardContent>
    </Card>
  )
}

interface WishlistItem {
  id: string
  createdAt: Date
  product: {
    id: string
    title: string
    price: number
    images: string[]
    status: string
    seller: {
      id: string
      name: string | null
      image: string | null
      sellerRating: number | null
    }
    category: {
      id: string
      name: string
      slug: string
    }
    _count: {
      wishlistItems: number
      offers: number
    }
  }
}

function WishlistCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: WishlistItem
  onRemove: () => void
  isRemoving: boolean
}) {
  const imageUrl = item.product.images[0]

  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-4">
        {/* Product thumbnail */}
        <Link href={`/produs/${item.product.id}`}>
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={item.product.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <AlertCircle className="size-6" />
              </div>
            )}
          </div>
        </Link>

        {/* Product details */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/produs/${item.product.id}`}
            className="text-sm font-medium hover:underline"
          >
            {item.product.title}
          </Link>
          <p className="mt-1 text-sm font-semibold text-primary">
            {formatRON(item.product.price)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adaugat pe{' '}
            {new Date(item.createdAt).toLocaleDateString('ro-RO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isRemoving}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          title="Sterge din wishlist"
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

export default function WishlistClient() {
  const utils = trpc.useUtils()
  const wishlistQuery = trpc.product.getWishlist.useQuery()
  const toggleMutation = trpc.product.toggleWishlist.useMutation({
    onSuccess: () => {
      utils.product.getWishlist.invalidate()
    },
  })

  const items = wishlistQuery.data as WishlistItem[] | undefined

  if (wishlistQuery.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <WishlistCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="size-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">
          Wishlist-ul tau este gol.
        </p>
        <Link href="/categorii">
          <Button variant="outline" className="mt-4">
            <ShoppingBag className="mr-2 size-4" />
            Exploreaza produse
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <WishlistCard
          key={item.id}
          item={item}
          onRemove={() =>
            toggleMutation.mutate({ productId: item.product.id })
          }
          isRemoving={toggleMutation.isPending}
        />
      ))}
    </div>
  )
}
