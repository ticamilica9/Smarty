'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { FileQuestion, Clock, PlusCircle, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type RFQStatus = 'OPEN' | 'CLOSED' | 'AWARDED'
type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'COUNTERED'

const rfqStatusConfig: Record<RFQStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  OPEN: { label: 'Deschisa', variant: 'default' },
  CLOSED: { label: 'Inchisa', variant: 'secondary' },
  AWARDED: { label: 'Adjudecata', variant: 'outline' },
}

const offerStatusConfig: Record<OfferStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'In asteptare', variant: 'secondary' },
  ACCEPTED: { label: 'Acceptata', variant: 'default' },
  REFUSED: { label: 'Respinsa', variant: 'destructive' },
  COUNTERED: { label: 'Contra-oferta', variant: 'outline' },
}

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  if (diff <= 0) return 'Expirata'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days} zile`
  return 'Mai putin de o zi'
}

function RFQCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyRFQsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('open')

  const { data: rfqs, isLoading } = trpc.rfq.getMyRFQs.useQuery()

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Autentifica-te pentru a vedea cererile tale.
        </p>
      </div>
    )
  }

  const openRFQs = rfqs?.filter((r) => r.status === 'OPEN') ?? []
  const awardedRFQs = rfqs?.filter((r) => r.status === 'AWARDED') ?? []
  const closedRFQs = rfqs?.filter((r) => r.status === 'CLOSED') ?? []

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cererile mele</h1>
          <p className="mt-1 text-muted-foreground">
            Gestioneaza cererile tale de oferta.
          </p>
        </div>
        <Link href="/cereri/noua">
          <Button>
            <PlusCircle className="size-4" />
            Cerere noua
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="open">
            Active ({openRFQs.length})
          </TabsTrigger>
          <TabsTrigger value="awarded">
            Adjudecate ({awardedRFQs.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Inchise ({closedRFQs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          {renderRFQList(openRFQs, isLoading, 'Nu ai nicio cerere activa.')}
        </TabsContent>

        <TabsContent value="awarded" className="mt-4">
          {renderRFQList(awardedRFQs, isLoading, 'Nu ai cereri adjudecate.')}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {renderRFQList(closedRFQs, isLoading, 'Nu ai cereri inchise.')}
        </TabsContent>
      </Tabs>
    </div>
  )

  function renderRFQList(
    items: NonNullable<typeof rfqs>,
    loading: boolean,
    emptyMessage: string,
  ) {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <RFQCardSkeleton key={i} />
          ))}
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileQuestion className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {items.map((rfq) => (
          <Link key={rfq.id} href={`/cereri/${rfq.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold leading-tight">
                        {rfq.title}
                      </h3>
                      <Badge
                        variant={rfqStatusConfig[rfq.status as RFQStatus]?.variant}
                        className="text-xs"
                      >
                        {rfqStatusConfig[rfq.status as RFQStatus]?.label ?? rfq.status}
                      </Badge>
                    </div>

                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
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
                        {rfq.offers.length} ofert
                        {rfq.offers.length === 1 ? 'a' : 'e'}
                      </span>
                    </div>

                    {/* Show accepted offer if awarded */}
                    {rfq.status === 'AWARDED' && rfq.offers.some((o) => o.status === 'ACCEPTED') && (
                      <div className="mt-2 rounded-md bg-primary/5 p-2 text-sm">
                        <span className="font-medium">
                          Oferta acceptata:{' '}
                          {formatRON(
                            rfq.offers.find((o) => o.status === 'ACCEPTED')?.amount ?? 0,
                          )}
                        </span>
                        {rfq.offers.find((o) => o.status === 'ACCEPTED')?.seller.name && (
                          <span className="text-muted-foreground">
                            {' '}de{' '}
                            {rfq.offers.find((o) => o.status === 'ACCEPTED')?.seller.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {rfq.category && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {rfq.category.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  }
}
