import { Suspense } from "react"
import { ShieldAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DisputeList } from "./dispute-list"

export const dynamic = "force-dynamic"

export default function AdminDisputePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
          <ShieldAlert className="size-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispute</h1>
          <p className="text-sm text-muted-foreground">
            Gestioneaza disputele dintre cumparatori si vanzatori
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <DisputeList />
      </Suspense>
    </div>
  )
}
