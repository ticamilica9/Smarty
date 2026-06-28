import { Suspense } from "react"
import { ShoppingBag } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { OrdersTable } from "./OrdersTable"

export const dynamic = "force-dynamic"

export default function AdminComenziPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <ShoppingBag className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comenzi</h1>
          <p className="text-sm text-muted-foreground">
            Gestioneaza toate comenzile platformei
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <OrdersTable />
      </Suspense>
    </div>
  )
}
