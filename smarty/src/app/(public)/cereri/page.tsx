'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { FileQuestion, Clock, Loader2, SearchIcon } from 'lucide-react'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

function RFQSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  if (diff <= 0) return 'Expirata'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} zile ${hours} ore`
  if (hours > 0) return `${hours} ore`
  return 'Mai putin de o ora'
}

export default function RFQListPage() {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: categories } = trpc.category.getAll.useQuery()
  const { data, isLoading } = trpc.rfq.getAll.useQuery({
    search: search || undefined,
    categoryId: categoryId || undefined,
    limit: 50,
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cereri de oferta</h1>
        <p className="mt-2 text-muted-foreground">
          Cumparatorii posteaza cereri pentru produsele pe care si le doresc.
          Vanzatorii pot trimite oferte cu preturi si produse.
        </p>
        {session?.user && (
          <Link href="/cereri/noua" className="mt-4 inline-block">
            <Button>Posteaza o cerere</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cauta cereri..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v === 'all' ? '' : v ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toate categoriile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate categoriile</SelectItem>
              {categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <RFQSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.rfqs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileQuestion className="size-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">Nicio cerere de oferta</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Nu exista cereri active in acest moment.
            {session?.user
              ? ' Fii primul care posteaza o cerere!'
              : ' Autentifica-te pentru a posta o cerere.'}
          </p>
          {session?.user && (
            <Link href="/cereri/noua" className="mt-6">
              <Button>Posteaza o cerere</Button>
            </Link>
          )}
        </div>
      )}

      {/* RFQ List */}
      {!isLoading && data && data.rfqs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {data.total} cerer{data.total === 1 ? 'e' : 'i'} active gasite
          </p>
          <div className="space-y-4">
            {data.rfqs.map((rfq: any) => (
              <Link key={rfq.id} href={`/cereri/${rfq.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-tight">
                          {rfq.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {rfq.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="font-medium text-primary">
                            Buget: {formatRON(rfq.maxBudget)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {getTimeRemaining(rfq.expiresAt)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {rfq._count.offers} ofert
                            {rfq._count.offers === 1 ? 'a' : 'e'}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {rfq.category && (
                          <Badge variant="secondary" className="text-xs">
                            {rfq.category.name}
                          </Badge>
                        )}
                        {rfq.buyer.name && (
                          <span className="text-xs text-muted-foreground">
                            de {rfq.buyer.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
