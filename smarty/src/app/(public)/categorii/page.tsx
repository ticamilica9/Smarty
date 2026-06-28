import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await prisma.productCategory.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: 'Categorii' }]} className="mb-6" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Toate categoriile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length} categorii principale
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/categorii/${cat.slug}`} className="group block">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {cat.icon && <span className="text-xl">{cat.icon}</span>}
                    {cat.name}
                  </CardTitle>
                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cat.children.slice(0, 5).map((child) => (
                    <Badge key={child.id} variant="secondary" className="text-xs font-normal">
                      {child.name}
                    </Badge>
                  ))}
                  {cat.children.length > 5 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{cat.children.length - 5}
                    </Badge>
                  )}
                </div>

                <CardDescription className="text-xs">
                  {cat._count.products} produse &middot; {cat._count.children} subcategorii
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
