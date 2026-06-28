"use client"

import Link from "next/link"
import {
  ShieldAlert,
  Package,
  ShoppingBag,
  Store,
  Clock,
  AlertCircle,
} from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { formatRON } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { DisputeActions } from "./dispute-actions"

type ReturnStatus = "REQUESTED" | "ACCEPTED" | "REFUSED" | "SHIPPED_BACK" | "REFUNDED"

const returnStatusConfig: Record<
  ReturnStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  REQUESTED: { label: "Solicitat", variant: "secondary" },
  ACCEPTED: { label: "Acceptat", variant: "default" },
  REFUSED: { label: "Refuzat", variant: "destructive" },
  SHIPPED_BACK: { label: "Expediat inapoi", variant: "outline" },
  REFUNDED: { label: "Rambursat", variant: "default" },
}

export function DisputeList() {
  const { data: disputedOrders, isLoading } = trpc.admin.getDisputedOrders.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!disputedOrders || disputedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShieldAlert className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">Nicio disputa activa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Nu exista comenzi in status de disputa in acest moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {disputedOrders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-destructive" />
                <CardTitle className="text-base">
                  Disputa #{order.id.slice(0, 8)}
                </CardTitle>
              </div>
              <Badge variant="destructive">Disputa</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product info */}
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/produse/${order.product.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {order.product.title}
                </Link>
                <p className="text-lg font-bold text-primary">
                  {formatRON(order.amount)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Buyer & Seller info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Cumparator: </span>
                  <span className="font-medium">{order.buyer.name ?? order.buyer.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <Store className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Vanzator: </span>
                  <span className="font-medium">{order.seller.name ?? order.seller.email}</span>
                </div>
              </div>
            </div>

            {/* Return request info */}
            {order.return_ && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Cerere de returnare
                      </span>
                    </div>
                    <Badge
                      variant={
                        returnStatusConfig[order.return_.status as ReturnStatus]?.variant ??
                        "secondary"
                      }
                    >
                      {returnStatusConfig[order.return_.status as ReturnStatus]?.label ??
                        order.return_.status}
                    </Badge>
                  </div>
                  {order.return_.reason && (
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      {order.return_.reason}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Payment info */}
            {order.payment && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Status plata:{" "}
                    <span className="font-medium text-foreground">
                      {order.payment.status === "HELD"
                        ? "In escrow"
                        : order.payment.status === "RELEASED"
                          ? "Platit"
                          : order.payment.status === "REFUNDED"
                            ? "Rambursat"
                            : order.payment.status}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Data:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </div>
              </>
            )}

            <Separator />

            {/* Admin actions */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actiuni administrative
              </p>
              <DisputeActions orderId={order.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
