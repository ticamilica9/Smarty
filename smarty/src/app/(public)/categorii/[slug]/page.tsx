import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductFilters } from '@/components/product/product-filters'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const sp = await searchParams

  const category = await prisma.productCategory.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: {
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { products: true } },
    },
  })

  if (!category) {
    notFound()
  }

  // Build ancestor chain
  const ancestors: { label: string; href?: string }[] = []
  if (category.parent) {
    const grandparent = await prisma.productCategory.findUnique({
      where: { id: category.parent.parentId ?? '' },
      select: { name: true, slug: true },
    })

    if (grandparent) {
      ancestors.push({ label: grandparent.name, href: `/categorii/${grandparent.slug}` })
    }
    ancestors.push({ label: category.parent.name, href: `/categorii/${category.parent.slug}` })
  }
  ancestors.push({ label: category.name })

  // Query products
  const conditions = sp.stare ? (Array.isArray(sp.stare) ? sp.stare : [sp.stare]) : undefined
  const priceMin = sp.pretMin ? Number(sp.pretMin) : undefined
  const priceMax = sp.pretMax ? Number(sp.pretMax) : undefined

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      status: 'ACTIVE',
      ...(conditions && conditions.length > 0 ? { condition: { in: conditions as any } } : {}),
      ...(priceMin !== undefined || priceMax !== undefined
        ? {
            price: {
              ...(priceMin !== undefined ? { gte: priceMin } : {}),
              ...(priceMax !== undefined ? { lte: priceMax } : {}),
            },
          }
        : {}),
    },
    include: {
      seller: {
        select: { id: true, name: true, image: true },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalProducts = category._count?.products ?? 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={ancestors} className="mb-6" />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalProducts} produs{totalProducts !== 1 ? 'e' : ''}
          {category.parent && (
            <>
              {' '}in{' '}
              <Link
                href={`/categorii/${category.parent.slug}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {category.parent.name}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Subcategorii
          </h2>
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/categorii/${child.slug}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors',
                  'hover:border-foreground/30 hover:bg-muted',
                )}
              >
                {child.name}
                {child._count.products > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({child._count.products})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products section */}
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Filters - desktop sidebar */}
        <div className="hidden lg:block">
          <ProductFilters />
        </div>

        {/* Product grid */}
        <div>
          {/* Mobile filters trigger */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <p className="text-sm text-muted-foreground">
              {products.length} produs{products.length !== 1 ? 'e' : ''} gasite
            </p>
            {/* Mobile filter button - using a simple button since Sheet would be complex */}
            <details className="group">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtre
              </summary>
              <div className="mt-3 rounded-lg border bg-card p-4">
                <ProductFilters />
              </div>
            </details>
          </div>

          <p className="mb-4 hidden text-sm text-muted-foreground lg:block">
            {products.length} produs{products.length !== 1 ? 'e' : ''} gasite
          </p>

          <ProductGrid
            products={products.map((p) => ({
              ...p,
              slug: p.id, // No slug field in schema yet, using id
            }))}
            emptyMessage="Nu au fost gasite produse in aceasta categorie."
          />
        </div>
      </div>
    </div>
  )
}
