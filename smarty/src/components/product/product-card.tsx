'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'

import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatRON, conditionLabel } from '@/lib/utils'

export interface ProductCardProduct {
  id: string
  title: string
  price: number
  images: string[]
  condition: string
  status: string
  slug?: string
  seller?: {
    id: string
    name: string | null
    image: string | null
  }
  category?: {
    id: string
    name: string
    slug: string
  }
  createdAt: Date | string
}

interface ProductCardProps {
  product: ProductCardProduct
  className?: string
  showSeller?: boolean
}

export function ProductCard({ product, className, showSeller = true }: ProductCardProps) {
  const primaryImage = product.images[0]

  return (
    <Card className={cn('group/card overflow-hidden', className)} size="sm">
      <Link href={`/produse/${product.slug ?? product.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <svg
                className="size-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
            </div>
          )}

          {/* Condition badge */}
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-background/80 backdrop-blur-xs"
          >
            {conditionLabel(product.condition)}
          </Badge>

          {/* Wishlist button */}
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-2 bg-background/60 backdrop-blur-xs hover:bg-background/80"
            aria-label="Adauga la favorite"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Heart className="size-4" />
          </Button>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="grid gap-1">
        {product.category && (
          <p className="text-xs text-muted-foreground">{product.category.name}</p>
        )}
        <CardTitle className="line-clamp-2">
          <Link href={`/produse/${product.slug ?? product.id}`} className="hover:underline">
            {product.title}
          </Link>
        </CardTitle>
        <p className="text-base font-semibold">{formatRON(product.price)}</p>
        {showSeller && product.seller && (
          <p className="text-xs text-muted-foreground">
            de{' '}
            <Link
              href={`/vanzator/${product.seller.id}`}
              className="hover:text-foreground hover:underline"
            >
              {product.seller.name ?? 'Vanzator'}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
