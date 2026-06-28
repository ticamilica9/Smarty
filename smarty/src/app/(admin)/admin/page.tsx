import { LayoutDashboard, Users, Package, ShoppingBag, ShieldAlert, Banknote, Clock } from "lucide-react"
import Link from "next/link"

import { formatRON } from "@/lib/utils"
import { api } from "@/lib/trpc/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CREATED: { label: "Creata", variant: "secondary" },
  PAID: { label: "Platita", variant: "default" },
  SHIPPED: { label: "Expediata", variant: "default" },
  DELIVERED: { label: "Livrata", variant: "outline" },
  RETURNED: { label: "Returnata", variant: "secondary" },
  DISPUTED: { label: "Disputa", variant: "destructive" },
  CANCELLED: { label: "Anulata", variant: "destructive" },
}

export default async function AdminPage() {
  const caller = await api()
  const [stats, latestOrders] = await Promise.all([
    caller.admin.getDashboardStats().catch(() => ({ totalUsers: 0, totalProducts: 0, totalOrders: 0, disputedOrders: 0, totalRevenue: 0 })),
    caller.admin.getLatestOrders().catch(() => []),
  ])

  const statCards = [
    {
      title: "Utilizatori",
      value: stats.totalUsers,
      icon: Users,
      href: "/admin/utilizatori",
      variant: "primary" as const,
    },
    {
      title: "Produse active",
      value: stats.totalProducts,
      icon: Package,
      href: "/admin/produse",
      variant: "default" as const,
    },
    {
      title: "Comenzi totale",
      value: stats.totalOrders,
      icon: ShoppingBag,
      href: "/admin/comenzi",
      variant: "default" as const,
    },
    {
      title: "Dispute active",
      value: stats.disputedOrders,
      icon: ShieldAlert,
      href: "/admin/dispute",
      variant: stats.disputedOrders > 0 ? "destructive" as const : "default" as const,
    },
    {
      title: "Venit total",
      value: formatRON(stats.totalRevenue),
      icon: Banknote,
      href: "#",
      variant: "primary" as const,
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <LayoutDashboard className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Panou Administrativ
          </h1>
          <p className="text-sm text-muted-foreground">
            Bine ai venit in panoul de administrare Smarty.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const variantClasses = {
            primary: "bg-primary/10 text-primary",
            default: "bg-muted text-foreground",
            destructive: "bg-destructive/10 text-destructive",
          }

          return (
            <Card key={stat.title}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${variantClasses[stat.variant]}`}
                  >
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Comenzi recente</h2>
          </div>
          <Link
            href="/admin/comenzi"
            className="text-sm text-primary hover:underline"
          >
            Vezi toate comenzile →
          </Link>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Produs</TableHead>
                <TableHead>Cumparator</TableHead>
                <TableHead>Suma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nu exista comenzi recente.
                  </TableCell>
                </TableRow>
              )}
              {latestOrders.map((order: any) => (
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
                    <span className="text-sm">{order.buyer?.name ?? order.buyer?.email ?? "—"}</span>
                  </TableCell>
                  <TableCell className="font-medium">{formatRON(order.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[order.status]?.variant ?? "secondary"}>
                      {statusConfig[order.status]?.label ?? order.status}
                    </Badge>
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
        </Card>
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Acces rapid</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/comenzi" className="group">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingBag className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium group-hover:underline">Comenzi</p>
                  <p className="text-sm text-muted-foreground">
                    Vezi si administreaza comenzile
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/utilizatori" className="group">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium group-hover:underline">Utilizatori</p>
                  <p className="text-sm text-muted-foreground">
                    Gestioneaza utilizatorii platformei
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dispute" className="group">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-destructive/10">
                  <ShieldAlert className="size-6 text-destructive" />
                </div>
                <div>
                  <p className="font-medium group-hover:underline">Dispute</p>
                  <p className="text-sm text-muted-foreground">
                    Gestioneaza disputele active
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/produse" className="group">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  <Package className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium group-hover:underline">Produse</p>
                  <p className="text-sm text-muted-foreground">
                    Administreaza produsele platformei
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
