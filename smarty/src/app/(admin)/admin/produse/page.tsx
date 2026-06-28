"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Package,
  Search,
  Loader2,
  Trash2,
  Star,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  CalendarDays,
  Store,
  Tags,
} from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { formatRON } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

type ProductData = {
  id: string
  title: string
  price: number
  status: string
  featured?: boolean
  createdAt: Date | string
  seller?: { id: string; name: string; email: string; image: string | null } | null
  category?: { id: string; name: string; slug: string } | null
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Activ", variant: "default" },
  SOLD: { label: "Vandut", variant: "secondary" },
  HIDDEN: { label: "Ascuns", variant: "outline" },
}

export default function AdminProdusePage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [deleteTarget, setDeleteTarget] = useState<ProductData | null>(null)

  const { data, isLoading } = trpc.admin.getAllProducts.useQuery({
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : (statusFilter as "ACTIVE" | "SOLD" | "HIDDEN"),
    limit: 100,
  })

  const deleteProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("Produsul a fost sters cu succes.")
      setDeleteTarget(null)
      utils.admin.getAllProducts.invalidate()
      utils.admin.getDashboardStats.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
      setDeleteTarget(null)
    },
  })

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: (_, vars) => {
      if (vars.featured !== undefined) {
        toast.success(vars.featured ? "Produsul este acum featured pe homepage." : "Produsul nu mai este featured.")
      }
      if (vars.status) {
        const label = statusConfig[vars.status]?.label ?? vars.status
        toast.success(`Statusul produsului a fost schimbat in "${label}".`)
      }
      utils.admin.getAllProducts.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleToggleStatus = (product: ProductData) => {
    const newStatus = product.status === "ACTIVE" ? "HIDDEN" : "ACTIVE"
    updateProduct.mutate({ productId: product.id, status: newStatus as "ACTIVE" | "HIDDEN" | "SOLD" })
  }

  const handleMarkSold = (product: ProductData) => {
    updateProduct.mutate({ productId: product.id, status: "SOLD" })
  }

  const handleToggleFeatured = (product: ProductData) => {
    updateProduct.mutate({ productId: product.id, featured: !product.featured })
  }

  const products = data?.products ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produse</h1>
          <p className="text-sm text-muted-foreground">
            Gestioneaza toate produsele platformei
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cauta produse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "ALL")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toate</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SOLD">Vandute</SelectItem>
              <SelectItem value="HIDDEN">Ascunse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} produs{(data.total !== 1 ? "e" : "")} gasit{(data.total !== 1 ? "e" : "")}
          </span>
        )}
      </div>

      {/* Products table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produs</TableHead>
              <TableHead>Vanzator</TableHead>
              <TableHead>Pret</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Actiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Nu exista produse.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              products.map((product: ProductData) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="max-w-[250px]">
                      <p className="font-medium truncate">{product.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Store className="size-3" />
                      {product.seller?.name ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatRON(product.price)}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[product.status]?.variant ?? "secondary"}>
                      {statusConfig[product.status]?.label ?? product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.featured ? (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                        <Star className="mr-1 size-3 fill-white" />
                        Featured
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {new Date(product.createdAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle featured */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFeatured(product)}
                        disabled={updateProduct.isPending}
                        title={product.featured ? "Elimina featured" : "Adauga featured"}
                      >
                        <Star
                          className={`size-4 ${product.featured ? "fill-amber-400 text-amber-400" : ""}`}
                        />
                      </Button>

                      {/* Toggle active/hidden */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(product)}
                        disabled={updateProduct.isPending}
                        title={product.status === "ACTIVE" ? "Ascunde produsul" : "Activeaza produsul"}
                      >
                        {product.status === "ACTIVE" || product.status === "SOLD" ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>

                      {/* Mark as sold (only if active) */}
                      {product.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkSold(product)}
                          disabled={updateProduct.isPending}
                          title="Marcheaza ca vandut"
                        >
                          <CheckCircle2 className="size-4 text-green-500" />
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(product)}
                        disabled={deleteProduct.isPending}
                        title="Sterge produsul"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              Confirma stergerea
            </DialogTitle>
            <DialogDescription>
              Esti sigur ca doresti sa stergi produsul{" "}
              <strong>{deleteTarget?.title}</strong> in valoare de{" "}
              {deleteTarget ? formatRON(deleteTarget.price) : ""}?
              Aceasta actiune este ireversibila.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteProduct.isPending}
            >
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteProduct.mutate({ productId: deleteTarget.id })}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Sterge produsul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
