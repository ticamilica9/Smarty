import { LayoutDashboard, Users, Package, ShoppingBag, ShieldAlert, Banknote } from "lucide-react"
import Link from "next/link"

import { formatRON } from "@/lib/utils"
import { api } from "@/lib/trpc/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const stats = await (await api()).admin.getDashboardStats()

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
