import { cn } from '@/lib/utils'
import { ProductCard, type ProductCardProduct } from './product-card'

interface ProductGridProps {
  products: ProductCardProduct[]
  className?: string
  emptyMessage?: string
  showSeller?: boolean
  columns?: 2 | 3 | 4
}

export function ProductGrid({
  products,
  className,
  emptyMessage = 'Nu au fost gasite produse.',
  showSeller = true,
  columns = 4,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="mb-4 size-12 text-muted-foreground/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  const gridCols = {
    2: 'grid-cols-2 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        gridCols[columns],
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showSeller={showSeller}
        />
      ))}
    </div>
  )
}
