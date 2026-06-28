'use client'

import { useState } from 'react'
import { useParams, notFound, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Clock,
  AlertCircle,
  User,
  FileQuestion,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} zile ${hours} ore`
  if (hours > 0) return `${hours} ore`
  return 'Mai putin de o ora'
}

export default function RFQDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: session } = useSession()
  const utils = trpc.useUtils()

  const { data: rfq, isLoading } = trpc.rfq.getById.useQuery({ id })

  // Offer submission state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [offerProductId, setOfferProductId] = useState('')

  // Submit offer mutation
  const submitOffer = trpc.rfq.offer.useMutation({
    onSuccess: () => {
      toast.success('Oferta ta a fost trimisa cu succes!')
      setOfferDialogOpen(false)
      setOfferAmount('')
      setOfferMessage('')
      setOfferProductId('')
      utils.rfq.getById.invalidate({ id })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Accept offer mutation
  const acceptOffer = trpc.rfq.accept.useMutation({
    onSuccess: () => {
      toast.success('Oferta a fost acceptata! Comanda a fost creata.')
      utils.rfq.getById.invalidate({ id })
      utils.rfq.getMyRFQs.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Seller's products for the offer dialog
  const { data: myProducts } = trpc.product.getMyProducts.useQuery(undefined, {
    enabled: !!session?.user && offerDialogOpen,
  })

  const isLoadingMutation =
    submitOffer.isPending || acceptOffer.isPending

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // Not found
  if (!rfq) {
    notFound()
  }

  const isOwner = session?.user?.id === rfq.buyerId
  const isOpen = rfq.status === 'OPEN'
  const isExpired = new Date(rfq.expiresAt) < new Date()
  const canOffer = !!session?.user && !isOwner && isOpen && !isExpired

  const offers = (rfq as any).offers ?? []

  const handleSubmitOffer = () => {
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introdu o suma valida')
      return
    }
    if (amount > rfq.maxBudget) {
      toast.error(`Oferta nu poate depasi bugetul maxim de ${formatRON(rfq.maxBudget)}`)
      return
    }
    submitOffer.mutate({
      rfqId: id,
      amount,
      message: offerMessage.trim() || undefined,
      productId: offerProductId || undefined,
    })
  }

  const handleAcceptOffer = (offerId: string) => {
    acceptOffer.mutate({ rfqId: id, offerId })
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/cereri"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Inapoi la cereri
      </Link>

      {/* RFQ Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {rfq.title}
              </h1>
              <Badge variant={rfqStatusConfig[rfq.status as RFQStatus]?.variant}>
                {rfqStatusConfig[rfq.status as RFQStatus]?.label ?? rfq.status}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                {rfq.buyer.name ?? 'Anonim'}
              </span>
              {rfq.category && (
                <Badge variant="secondary" className="text-xs">
                  {rfq.category.name}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {isExpired ? 'Expirata' : `${getTimeRemaining(rfq.expiresAt)} ramase`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatRON(rfq.maxBudget)}
            </p>
            <p className="text-xs text-muted-foreground">buget maxim</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Descriere
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {rfq.description}
          </p>
        </CardContent>
      </Card>

      {/* Action: Post an offer */}
      {canOffer && (
        <div className="mb-8">
          <Button
            size="lg"
            onClick={() => setOfferDialogOpen(true)}
            disabled={isLoadingMutation}
          >
            <Send className="size-4" />
            Trimite oferta
          </Button>
        </div>
      )}

      {!session?.user && isOpen && !isExpired && (
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Autentifica-te pentru a trimite o oferta
          </Link>
        </div>
      )}

      {isOwner && !isOpen && (
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">
            Aceasta cerere este {rfq.status === 'AWARDED' ? 'adjudecata' : 'inchisa'}.
          </p>
        </div>
      )}

      <Separator className="my-6" />

      {/* Offers section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Oferte primite ({offers.length})
        </h2>

        {offers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="size-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nu s-au primit oferte inca.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {offers.map((offer: any) => {
            const offerStatus = offerStatusConfig[offer.status as OfferStatus]
            const isPending = offer.status === 'PENDING'
            const canAccept = isOwner && isOpen && isPending

            return (
              <Card
                key={offer.id}
                className={
                  offer.status === 'ACCEPTED' ? 'border-primary/50 bg-primary/5' : ''
                }
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {offer.seller.name ?? 'Vanzator'}
                        </span>
                        {offer.seller.sellerRating > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ★ {offer.seller.sellerRating.toFixed(1)}
                          </span>
                        )}
                        <Badge variant={offerStatus.variant} className="text-xs">
                          {offerStatus.label}
                        </Badge>
                      </div>

                      <p className="mt-2 text-lg font-semibold text-primary">
                        {formatRON(offer.amount)}
                      </p>

                      {offer.message && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {offer.message}
                        </p>
                      )}

                      {offer.product && (
                        <Link
                          href={`/produse/${offer.product.id}`}
                          className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          <Package className="size-3.5" />
                          {offer.product.title}
                        </Link>
                      )}

                      <p className="mt-1 text-xs text-muted-foreground">
                        Trimis la{' '}
                        {new Date(offer.createdAt).toLocaleDateString('ro-RO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Action: Accept offer (buyer only, when OPEN) */}
                    {canAccept && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={isLoadingMutation}
                      >
                        {acceptOffer.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3" />
                        )}
                        Accepta
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Offer submission dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trimite oferta</DialogTitle>
            <DialogDescription>
              Propune un pret si un produs pentru &quot;{rfq.title}&quot;.
              Bugetul maxim al cumparatorului: {formatRON(rfq.maxBudget)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="offer-amount">
                Pretul tau (RON) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="offer-amount"
                type="number"
                min={0.01}
                step={0.01}
                max={rfq.maxBudget}
                placeholder={`Max ${rfq.maxBudget}`}
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Oferta nu poate depasi {formatRON(rfq.maxBudget)}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="offer-product">Produs (optional)</Label>
              <select
                id="offer-product"
                value={offerProductId}
                onChange={(e) => setOfferProductId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-ring transition-colors focus:border-ring focus:ring-1"
              >
                <option value="">Fara produs asociat</option>
                {myProducts
                  ?.filter((p: any) => p.status === 'ACTIVE')
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} - {formatRON(p.price)}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Asociaza un produs existent din anunturile tale
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="offer-message">Mesaj (optional)</Label>
              <Textarea
                id="offer-message"
                rows={3}
                placeholder="Adauga un mesaj pentru cumparator..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOfferDialogOpen(false)
                setOfferAmount('')
                setOfferMessage('')
                setOfferProductId('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={!offerAmount || submitOffer.isPending}
            >
              {submitOffer.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              Trimite oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
