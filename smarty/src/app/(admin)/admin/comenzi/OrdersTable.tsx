"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { formatRON } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type OrderStatus =
  | "CREATED"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "DISPUTED"
  | "CANCELLED"

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  CREATED: { label: "Creata", variant: "secondary" },
  PAID: { label: "Platita", variant: "default" },
  SHIPPED: { label: "Expediata", variant: "default" },
  DELIVERED: { label: "Livrata", variant: "outline" },
  RETURNED: { label: "Returnata", variant: "secondary" },
  DISPUTED: { label: "Disputa", variant: "destructive" },
  CANCELLED: { label: "Anulata", variant: "destructive" },
}

export function OrdersTable() {
  const [statusFilter, setStatusFilter] = useState<string | null>("ALL")
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data, isLoading } = trpc.admin.getAllOrders.useQuery({
    status: statusFilter === "ALL" ? undefined : (statusFilter as OrderStatus),
    limit: pageSize,
    offset: page * pageSize,
  })

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toate</SelectItem>
              <SelectItem value="CREATED">Create</SelectItem>
              <SelectItem value="PAID">Platite</SelectItem>
              <SelectItem value="SHIPPED">Expediate</SelectItem>
              <SelectItem value="DELIVERED">Livrate</SelectItem>
              <SelectItem value="RETURNED">Returnate</SelectItem>
              <SelectItem value="DISPUTED">Disputa</SelectItem>
              <SelectItem value="CANCELLED">Anulate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} comanda{(data.total !== 1 ? "i" : "")} gasita{(data.total !== 1 ? "e" : "")}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Produs</TableHead>
              <TableHead>Cumparator</TableHead>
              <TableHead>Vanzator</TableHead>
              <TableHead>Suma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plata</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && (!data || data.orders.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  Nu exista comenzi.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/comenzi/${order.id}`}
                      className="text-primary hover:underline"
                    >
                      #{order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <Link
                      href={`/produse/${order.product.id}`}
                      className="text-sm hover:underline"
                    >
                      <span className="line-clamp-1">{order.product.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{order.buyer.name ?? order.buyer.email ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{order.seller.name ?? order.seller.email ?? "—"}</span>
                  </TableCell>
                  <TableCell className="font-medium">{formatRON(order.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[order.status as OrderStatus]?.variant ?? "secondary"}>
                      {statusConfig[order.status as OrderStatus]?.label ?? order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.payment ? (
                      <span className="text-sm capitalize">{order.payment.status.toLowerCase()}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterioara
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page + 1} din {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Urmatoarea
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
