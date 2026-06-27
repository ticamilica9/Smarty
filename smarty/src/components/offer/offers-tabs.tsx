'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'COUNTERED'

const statusConfig: Record<OfferStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'In asteptare', variant: 'secondary' },
  ACCEPTED: { label: 'Acceptata', variant: 'default' },
  REFUSED: { label: 'Refuzata', variant: 'destructive' },
  COUNTERED: { label: 'Contra-oferta', variant: 'outline' },
}

function OfferCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-4">
        <Skeleton className="size-16 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardContent>
    </Card>
  )
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt < new Date()
}

interface Offer {
  id: string
  productId: string
  buyerId: string
  sellerId: string
  amount: number
  status: OfferStatus
  round: number
  expiresAt: Date
  createdAt: Date
  product: {
    id: string
    title: string
    price: number
    images: string[]
    status: string
  }
  buyer: {
    id: string
    name: string | null
    image: string | null
  }
  seller: {
    id: string
    name: string | null
    image: string | null
  }
}

function OfferCard({
  offer,
  perspective,
}: {
  offer: Offer
  perspective: 'buyer' | 'seller'
}) {
  const utils = trpc.useUtils()
  const [counterDialogOpen, setCounterDialogOpen] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const { data: session } = useSession()

  const respondMutation = trpc.offer.respond.useMutation({
    onSuccess: () => {
      toast.success('Actiune efectuata cu succes')
      utils.offer.getReceivedOffers.invalidate()
      utils.offer.getMyOffers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const acceptCounterMutation = trpc.offer.acceptCounter.useMutation({
    onSuccess: () => {
      toast.success('Actiune efectuata cu succes')
      utils.offer.getMyOffers.invalidate()
      utils.offer.getReceivedOffers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const status = statusConfig[offer.status]
  const expired = isExpired(offer.expiresAt)
  const isActive = (offer.status === 'PENDING' || offer.status === 'COUNTERED') && !expired
  const isBuyerPerspective = perspective === 'buyer'

  // Determine what actions to show
  const showAcceptRefuse = perspective === 'seller' && offer.status === 'PENDING' && !expired
  const showAcceptCounter = perspective === 'buyer' && offer.status === 'PENDING' && offer.round > 1 && !expired
  const showCounter = perspective === 'seller' && offer.status === 'PENDING' && offer.round < 3 && !expired

  const imageUrl = offer.product.images[0]

  const handleAccept = () => {
    respondMutation.mutate({ id: offer.id, action: 'ACCEPTED' })
  }

  const handleRefuse = () => {
    respondMutation.mutate({ id: offer.id, action: 'REFUSED' })
  }

  const handleCounter = () => {
    const amount = parseFloat(counterAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introdu o suma valida')
      return
    }
    respondMutation.mutate(
      { id: offer.id, action: 'COUNTERED', counterAmount: amount },
      {
        onSuccess: () => {
          setCounterDialogOpen(false)
          setCounterAmount('')
        },
      },
    )
  }

  const handleAcceptCounter = () => {
    acceptCounterMutation.mutate({ id: offer.id, action: 'ACCEPTED' })
  }

  const handleRefuseCounter = () => {
    acceptCounterMutation.mutate({ id: offer.id, action: 'REFUSED' })
  }

  const isLoading =
    respondMutation.isPending || acceptCounterMutation.isPending

  return (
    <>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            {/* Product thumbnail */}
            <Link
              href={`/produse/${offer.product.id}`}
              className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={offer.product.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground/40">
                  <AlertCircle className="size-6" />
                </div>
              )}
            </Link>

            {/* Offer details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/produse/${offer.product.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {offer.product.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Pret afisat: {formatRON(offer.product.price)}
                  </p>
                </div>
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
              </div>

              <Separator className="my-2" />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Oferta ta:{' '}
                  <span className="font-semibold text-foreground">
                    {formatRON(offer.amount)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Runda {offer.round}/3
                </span>
                <span className="text-xs text-muted-foreground">
                  {offer.createdAt.toLocaleDateString('ro-RO')}
                </span>
                {expired && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <Clock className="size-3" />
                    Expirata
                  </span>
                )}
              </div>

              {/* Counter-party info */}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {isBuyerPerspective ? (
                  <>
                    <MessageSquare className="size-3" />
                    Vanzator: {offer.seller.name ?? 'Anonim'}
                  </>
                ) : (
                  <>
                    <MessageSquare className="size-3" />
                    Cumparator: {offer.buyer.name ?? 'Anonim'}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Action buttons */}
        {(showAcceptRefuse || showAcceptCounter || showCounter) && (
          <CardFooter className="flex flex-wrap gap-2">
            {/* Seller: accept/refuse/counter for received PENDING offers */}
            {showAcceptRefuse && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleAccept}
                  disabled={isLoading}
                >
                  {respondMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  Accepta
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRefuse}
                  disabled={isLoading}
                >
                  <XCircle className="size-3" />
                  Refuza
                </Button>
                {showCounter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCounterDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <ArrowLeftRight className="size-3" />
                    Contra-oferta
                  </Button>
                )}
              </>
            )}

            {/* Buyer: accept/refuse a counter-offer */}
            {showAcceptCounter && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleAcceptCounter}
                  disabled={isLoading}
                >
                  {acceptCounterMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  Accepta contra-oferta
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRefuseCounter}
                  disabled={isLoading}
                >
                  <XCircle className="size-3" />
                  Refuza contra-oferta
                </Button>
              </>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Counter-offer dialog */}
      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contra-oferta</DialogTitle>
            <DialogDescription>
              Propune un pret pentru <strong>{offer.product.title}</strong>.
              Pretul curent afisat: {formatRON(offer.product.price)}.
              Oferta initiala: {formatRON(offer.amount)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Suma ta (RON)</label>
            <Input
              type="number"
              min={1}
              step={0.01}
              placeholder="ex: 50"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Contra-oferta trebuie sa fie mai mare decat oferta initiala
              ({formatRON(offer.amount)}) si mai mica decat pretul afisat
              ({formatRON(offer.product.price)}).
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCounterDialogOpen(false)
                setCounterAmount('')
              }}
            >
              Anuleaza
            </Button>
            <Button onClick={handleCounter} disabled={!counterAmount || respondMutation.isPending}>
              {respondMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Trimite contra-oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OfferList({
  offers,
  isLoading,
  perspective,
  emptyMessage,
}: {
  offers: Offer[] | undefined
  isLoading: boolean
  perspective: 'buyer' | 'seller'
  emptyMessage: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <OfferCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="size-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} perspective={perspective} />
      ))}
    </div>
  )
}

export function OffersTabs() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('my-offers')

  const myOffersQuery = trpc.offer.getMyOffers.useQuery()
  const receivedOffersQuery = trpc.offer.getReceivedOffers.useQuery()

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Autentifica-te pentru a vedea ofertele tale.
        </p>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
      <TabsList>
        <TabsTrigger value="my-offers">Ofertele mele</TabsTrigger>
        <TabsTrigger value="received-offers">Oferte primite</TabsTrigger>
      </TabsList>

      <TabsContent value="my-offers" className="mt-4">
        <OfferList
          offers={myOffersQuery.data}
          isLoading={myOffersQuery.isLoading}
          perspective="buyer"
          emptyMessage="Nu ai facut nicio oferta inca."
        />
      </TabsContent>

      <TabsContent value="received-offers" className="mt-4">
        <OfferList
          offers={receivedOffersQuery.data}
          isLoading={receivedOffersQuery.isLoading}
          perspective="seller"
          emptyMessage="Nu ai primit nicio oferta inca."
        />
      </TabsContent>
    </Tabs>
  )
}
