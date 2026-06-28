'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ShoppingBag, Store, Package, ChevronRight } from 'lucide-react'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'DISPUTED'
  | 'CANCELLED'

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  CREATED: { label: 'Creata', variant: 'secondary' },
  PAID: { label: 'Platita', variant: 'default' },
  SHIPPED: { label: 'Expediata', variant: 'default' },
  DELIVERED: { label: 'Livrata', variant: 'outline' },
  RETURNED: { label: 'Returnata', variant: 'secondary' },
  DISPUTED: { label: 'Disputa', variant: 'destructive' },
  CANCELLED: { label: 'Anulata', variant: 'destructive' },
}

interface Order {
  id: string
  buyerId: string
  sellerId: string
  amount: number
  status: OrderStatus
  createdAt: Date
  product: {
    id: string
    title: string
    price: number
    images: string[]
    status: string
  }
  buyer: { id: string; name: string | null; image: string | null }
  seller: { id: string; name: string | null; image: string | null }
  payment: { id: string; status: string; amount: number } | null
  shipment: {
    id: string
    easyboxAWB: string | null
    trackingUrl: string | null
    pickupCode: string | null
    status: string
    estimatedDelivery: Date | null
  } | null
  review: { id: string; rating: number; text: string | null; createdAt: Date } | null
  return_: { id: string; status: string; reason: string | null; createdAt: Date } | null
}

function OrderCardSkeleton() {
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

function OrderCard({
  order,
  perspective,
}: {
  order: Order
  perspective: 'buyer' | 'seller'
}) {
  const status = statusConfig[order.status] ?? {
    label: order.status,
    variant: 'secondary' as const,
  }
  const imageUrl = order.product.images[0]

  return (
    <Link href={`/comenzi/${order.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            {/* Product thumbnail */}
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={order.product.title}
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

            {/* Order details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{order.product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Comanda #{order.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-primary">
                  {formatRON(order.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {order.shipment?.easyboxAWB && (
                  <span className="text-xs text-muted-foreground">
                    AWB: {order.shipment.easyboxAWB}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {perspective === 'buyer' ? (
                  <>
                    <Store className="size-3" />
                    Vanzator: {order.seller.name ?? 'Anonim'}
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-3" />
                    Cumparator: {order.buyer.name ?? 'Anonim'}
                  </>
                )}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function OrderList({
  orders,
  isLoading,
  perspective,
  emptyMessage,
}: {
  orders: Order[] | undefined
  isLoading: boolean
  perspective: 'buyer' | 'seller'
  emptyMessage: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="size-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          perspective={perspective}
        />
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('my-orders')

  const myOrdersQuery = trpc.order.getMyOrders.useQuery()
  const mySalesQuery = trpc.order.getMySales.useQuery()

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Autentifica-te pentru a vedea comenzile tale.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Comenzile mele</h1>
        <p className="mt-1 text-muted-foreground">
          Vezi comenzile tale si comenzile primite ca vanzator.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="my-orders">
            <ShoppingBag className="mr-2 size-4" />
            Cumparaturi
          </TabsTrigger>
          <TabsTrigger value="my-sales">
            <Store className="mr-2 size-4" />
            Vanzari
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-orders" className="mt-4">
          <OrderList
            orders={myOrdersQuery.data as Order[] | undefined}
            isLoading={myOrdersQuery.isLoading}
            perspective="buyer"
            emptyMessage="Nu ai facut nicio comanda inca."
          />
        </TabsContent>

        <TabsContent value="my-sales" className="mt-4">
          <OrderList
            orders={mySalesQuery.data as Order[] | undefined}
            isLoading={mySalesQuery.isLoading}
            perspective="seller"
            emptyMessage="Nu ai primit nicio comanda inca."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
