'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  Store,
  ShoppingBag,
  User,
  Loader2,
  Star,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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

type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'DISPUTED'
  | 'CANCELLED'

type ReturnStatus = 'REQUESTED' | 'ACCEPTED' | 'REFUSED' | 'SHIPPED_BACK' | 'REFUNDED'

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Package }
> = {
  CREATED: { label: 'Creata', variant: 'secondary', icon: Package },
  PAID: { label: 'Platita', variant: 'default', icon: Package },
  SHIPPED: { label: 'Expediata', variant: 'default', icon: Truck },
  DELIVERED: { label: 'Livrata', variant: 'outline', icon: CheckCircle2 },
  RETURNED: { label: 'Returnata', variant: 'secondary', icon: RotateCcw },
  DISPUTED: { label: 'Disputa', variant: 'destructive', icon: ShieldAlert },
  CANCELLED: { label: 'Anulata', variant: 'destructive', icon: AlertCircle },
}

const returnStatusConfig: Record<
  ReturnStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  REQUESTED: { label: 'Solicitat', variant: 'secondary' },
  ACCEPTED: { label: 'Acceptat', variant: 'default' },
  REFUSED: { label: 'Refuzat', variant: 'destructive' },
  SHIPPED_BACK: { label: 'Expediat inapoi', variant: 'outline' },
  REFUNDED: { label: 'Ramursat', variant: 'default' },
}

export function OrderDetail({
  orderId,
  userId,
}: {
  orderId: string
  userId: string
}) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: order, isLoading } = trpc.order.getById.useQuery({ id: orderId })

  // Confirm delivery state
  const confirmDelivery = trpc.order.confirmDelivery.useMutation({
    onSuccess: () => {
      toast.success('Primirea a fost confirmata cu succes!')
      utils.order.getById.invalidate({ id: orderId })
      utils.order.getMyOrders.invalidate()
      utils.order.getMySales.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Return request state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')

  const requestReturn = trpc.return.request.useMutation({
    onSuccess: () => {
      toast.success('Cererea de returnare a fost trimisa cu succes!')
      setReturnDialogOpen(false)
      setReturnReason('')
      utils.order.getById.invalidate({ id: orderId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Return respond state (for seller)
  const respondReturn = trpc.return.respond.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'ACCEPTED'
          ? 'Returnarea a fost acceptata si rambursarea a fost initiata.'
          : 'Cererea de returnare a fost refuzata.',
      )
      utils.order.getById.invalidate({ id: orderId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Escalate to dispute
  const escalateToDispute = trpc.return.escalateToDispute.useMutation({
    onSuccess: () => {
      toast.success('Disputa a fost deschisa. Un moderator va analiza cazul.')
      utils.order.getById.invalidate({ id: orderId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Review state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [hoveredRating, setHoveredRating] = useState(0)

  const createReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success('Recenzia ta a fost publicata cu succes!')
      setReviewDialogOpen(false)
      setReviewRating(0)
      setReviewText('')
      utils.order.getById.invalidate({ id: orderId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleConfirmDelivery = () => {
    confirmDelivery.mutate({ orderId })
  }

  const handleSubmitReturn = () => {
    if (!returnReason || returnReason.length < 10) {
      toast.error('Motivul trebuie sa aiba cel putin 10 caractere')
      return
    }
    requestReturn.mutate({ orderId, reason: returnReason })
  }

  const handleRespondReturn = (action: 'ACCEPTED' | 'REFUSED') => {
    if (!order?.return_) return
    respondReturn.mutate({ id: order.return_.id, action })
  }

  const handleEscalate = () => {
    if (!order?.return_) return
    escalateToDispute.mutate({ returnId: order.return_.id })
  }

  const handleSubmitReview = () => {
    if (reviewRating === 0) {
      toast.error('Selecteaza un rating')
      return
    }
    createReview.mutate({
      orderId,
      rating: reviewRating,
      text: reviewText || undefined,
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="size-12 text-destructive/40" />
        <p className="mt-4 text-sm text-muted-foreground">
          Comanda nu a fost gasita.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/comenzi')}>
          Inapoi la comenzi
        </Button>
      </div>
    )
  }

  const isBuyer = order.buyerId === userId
  const isSeller = order.sellerId === userId
  const StatusIcon = statusConfig[order.status as OrderStatus]?.icon ?? Package
  const canConfirmDelivery = isBuyer && order.status === 'SHIPPED'
  const canRequestReturn = isBuyer && order.status === 'DELIVERED'
  const canReview = isBuyer && order.status === 'DELIVERED' && !order.review
  const canEscalate =
    isBuyer &&
    order.return_ &&
    order.return_.status === 'REFUSED' &&
    order.status !== 'DISPUTED'
  const isReturnPending =
    order.return_ && order.return_.status === 'REQUESTED'
  const isSellerReturnRespond =
    isSeller && isReturnPending

  const imageUrl = order.product.images[0]

  // Check if the order is within 14 days for returns
  const daysSinceDelivery = order.status === 'DELIVERED'
    ? Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const isWithinReturnWindow = daysSinceDelivery <= 14

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Button
        variant="ghost"
        className="-ml-2"
        onClick={() => router.push('/comenzi')}
      >
        <span className="mr-1">&larr;</span> Inapoi la comenzi
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Comanda #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Plasata pe{' '}
            {new Date(order.createdAt).toLocaleDateString('ro-RO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Badge variant={statusConfig[order.status as OrderStatus]?.variant ?? 'secondary'} className="w-fit">
          <StatusIcon className="mr-1.5 size-3.5" />
          {statusConfig[order.status as OrderStatus]?.label ?? order.status}
        </Badge>
      </div>

      {/* Product card */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Link
              href={`/produse/${order.product.id}`}
              className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={order.product.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground/40">
                  <AlertCircle className="size-8" />
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/produse/${order.product.id}`}
                className="text-base font-medium hover:underline"
              >
                {order.product.title}
              </Link>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatRON(order.amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order details grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Buyer / Seller info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {isBuyer ? 'Vanzator' : 'Cumparator'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                {isBuyer
                  ? order.seller.image ? (
                      <Image
                        src={order.seller.image}
                        alt={order.seller.name ?? 'Vanzator'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <Store className="size-5 text-muted-foreground" />
                    )
                  : order.buyer.image ? (
                      <Image
                        src={order.buyer.image}
                        alt={order.buyer.name ?? 'Cumparator'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <ShoppingBag className="size-5 text-muted-foreground" />
                    )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isBuyer
                    ? (order.seller.name ?? 'Vanzator')
                    : (order.buyer.name ?? 'Cumparator')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBuyer ? 'Vanzator' : 'Cumparator'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Plati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {order.payment ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status plata</span>
                  <span className="font-medium">{order.payment.status === 'HELD' ? 'In escrow' : order.payment.status === 'RELEASED' ? 'Platit' : order.payment.status === 'REFUNDED' ? 'Rambursat' : order.payment.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma</span>
                  <span className="font-medium">{formatRON(order.payment.amount)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Fara informatii de plata</p>
            )}
          </CardContent>
        </Card>

        {/* Shipping info */}
        {order.shipment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Expediere
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {order.shipment.easyboxAWB && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AWB</span>
                  <span className="font-medium">{order.shipment.easyboxAWB}</span>
                </div>
              )}
              {order.shipment.pickupCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cod ridicare</span>
                  <span className="font-medium">{order.shipment.pickupCode}</span>
                </div>
              )}
              {order.shipment.trackingUrl && (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline"
                >
                  Trackuiește coletul
                </a>
              )}
              {order.shipment.estimatedDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livrare estimata</span>
                  <span className="font-medium">
                    {new Date(order.shipment.estimatedDelivery).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Return info */}
      {order.return_ && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <RotateCcw className="size-4" />
              Returnare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  returnStatusConfig[order.return_.status as ReturnStatus]?.variant ??
                  'secondary'
                }
              >
                {returnStatusConfig[order.return_.status as ReturnStatus]?.label ??
                  order.return_.status}
              </Badge>
            </div>
            {order.return_.reason && (
              <div>
                <span className="text-sm text-muted-foreground">Motivul returnarii</span>
                <p className="mt-1 whitespace-pre-wrap text-sm">{order.return_.reason}</p>
              </div>
            )}

            {/* Seller respond to return */}
            {isSellerReturnRespond && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleRespondReturn('ACCEPTED')}
                  disabled={respondReturn.isPending}
                >
                  {respondReturn.isPending ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 size-3" />
                  )}
                  Accepta returnarea
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRespondReturn('REFUSED')}
                  disabled={respondReturn.isPending}
                >
                  <AlertCircle className="mr-1 size-3" />
                  Refuza
                </Button>
              </div>
            )}

            {/* Buyer escalate to dispute */}
            {canEscalate && (
              <div className="pt-2">
                <p className="mb-2 text-sm text-muted-foreground">
                  Ai primit un refuz la cererea ta de returnare. Poti escalada catre o disputa.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleEscalate}
                  disabled={escalateToDispute.isPending}
                >
                  {escalateToDispute.isPending ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <ShieldAlert className="mr-1 size-3" />
                  )}
                  Escaladeaza catre disputa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {order.review && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Star className="size-4" />
              Recenzia ta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < order.review!.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            {order.review.text && (
              <p className="text-sm text-muted-foreground">{order.review.text}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Confirm delivery */}
        {canConfirmDelivery && (
          <Button
            size="lg"
            onClick={handleConfirmDelivery}
            disabled={confirmDelivery.isPending}
          >
            {confirmDelivery.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Confirma primirea
          </Button>
        )}

        {/* Request return */}
        {canRequestReturn && isWithinReturnWindow && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => setReturnDialogOpen(true)}
            disabled={requestReturn.isPending}
          >
            <RotateCcw className="mr-2 size-4" />
            Solicita returnarea
          </Button>
        )}

        {/* Review button */}
        {canReview && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => setReviewDialogOpen(true)}
          >
            <Star className="mr-2 size-4" />
            Lasa o recenzie
          </Button>
        )}
      </div>

      {/* Return request dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicita returnarea</DialogTitle>
            <DialogDescription>
              Explica motivul returnarii pentru comanda <strong>{order.product.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-reason">
                Motivul returnarii <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="return-reason"
                placeholder="Descrie motivul returnarii (minim 10 caractere)..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Perioada de returnare este de 14 zile de la livrare.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReturnDialogOpen(false)
                setReturnReason('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitReturn}
              disabled={returnReason.length < 10 || requestReturn.isPending}
            >
              {requestReturn.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 size-4" />
              )}
              Trimite cererea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lasa o recenzie</DialogTitle>
            <DialogDescription>
              Evalueaza experienta ta cu comanda <strong>{order.product.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Star rating */}
            <div className="space-y-2">
              <Label>
                Rating <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1
                  const isFilled = starValue <= (hoveredRating || reviewRating)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewRating(starValue)}
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-colors"
                    >
                      <Star
                        className={`size-8 ${
                          isFilled
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30 hover:text-yellow-400/50'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-text">Parerea ta (optional)</Label>
              <Textarea
                id="review-text"
                placeholder="Impartaseste experienta ta cu acest produs..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false)
                setReviewRating(0)
                setReviewText('')
              }}
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewRating === 0 || createReview.isPending}
            >
              {createReview.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Star className="mr-2 size-4" />
              )}
              Publica recenzia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
