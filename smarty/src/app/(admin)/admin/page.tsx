'use client'

import { LayoutDashboard, Users, Package, ShoppingBag, ShieldAlert, Banknote, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { formatRON } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CREATED: { label: "Creata", variant: "secondary" },
  PAID: { label: "Platita", variant: "default" },
  SHIPPED: { label: "Expediata", variant: "default" },
  DELIVERED: { label: "Livrata", variant: "outline" },
  RETURNED: { label: "Returnata", variant: "secondary" },
  DISPUTED: { label: "Disputa", variant: "destructive" },
  CANCELLED: { label: "Anulata", variant: "destructive" },
}

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.getDashboardStats.useQuery()
  const { data: latestOrders, isLoading: ordersLoading } = trpc.admin.getLatestOrders.useQuery()

  const isLoading = statsLoading || ordersLoading

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="size-10 rounded-lg" /><Skeleton className="mt-3 h-8 w-16" /><Skeleton className="mt-1 h-4 w-24" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const s = stats ?? { totalUsers: 0, totalProducts: 0, totalOrders: 0, disputedOrders: 0, totalRevenue: 0 }
  const orders = latestOrders ?? []

  const statCards: { title: string; value: any; icon: any; href: string; variant: string }[] = [
    { title: "Utilizatori", value: s.totalUsers, icon: Users, href: "/admin/utilizatori", variant: "primary" },
    { title: "Produse active", value: s.totalProducts, icon: Package, href: "/admin/produse", variant: "default" },
    { title: "Comenzi totale", value: s.totalOrders, icon: ShoppingBag, href: "/admin/comenzi", variant: "default" },
    { title: "Dispute active", value: s.disputedOrders, icon: ShieldAlert, href: "/admin/dispute", variant: s.disputedOrders > 0 ? "destructive" : "default" },
    { title: "Venit total", value: formatRON(s.totalRevenue), icon: Banknote, href: "#", variant: "primary" },
  ]

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <LayoutDashboard className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panou Administrativ</h1>
          <p className="text-sm text-muted-foreground">Bine ai venit in panoul de administrare Smarty.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const variantClasses: Record<string, string> = { primary: "bg-primary/10 text-primary", default: "bg-muted text-foreground", destructive: "bg-destructive/10 text-destructive" }
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="pt-4">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${variantClasses[stat.variant]}`}>
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Comenzi recente</h2>
          </div>
          <Link href="/admin/comenzi" className="text-sm text-primary hover:underline">Vezi toate →</Link>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Produs</TableHead><TableHead>Cumparator</TableHead><TableHead>Suma</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nu exista comenzi recente.</TableCell></TableRow>
              )}
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[200px]"><span className="line-clamp-1 text-sm">{order.product?.title ?? "—"}</span></TableCell>
                  <TableCell><span className="text-sm">{order.buyer?.name ?? "—"}</span></TableCell>
                  <TableCell className="font-medium">{formatRON(order.amount)}</TableCell>
                  <TableCell><Badge variant={statusConfig[order.status]?.variant ?? "secondary"}>{statusConfig[order.status]?.label ?? order.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Acces rapid</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/admin/comenzi", icon: ShoppingBag, label: "Comenzi", desc: "Vezi si administreaza comenzile" },
            { href: "/admin/utilizatori", icon: Users, label: "Utilizatori", desc: "Gestioneaza utilizatorii platformei" },
            { href: "/admin/dispute", icon: ShieldAlert, label: "Dispute", desc: "Gestioneaza disputele active", destructive: true },
            { href: "/admin/produse", icon: Package, label: "Produse", desc: "Administreaza produsele platformei" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 pt-4">
                  <div className={`flex size-12 items-center justify-center rounded-lg ${item.destructive ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <item.icon className={`size-6 ${item.destructive ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div>
                    <p className="font-medium group-hover:underline">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
