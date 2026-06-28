"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function DisputeActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [confirmAction, setConfirmAction] = useState<"return" | "release" | "resolve" | null>(null)

  const forceReturn = trpc.admin.forceReturn.useMutation({
    onSuccess: () => {
      toast.success("Plata a fost rambursata si comanda a fost marcata ca returnata.")
      setConfirmAction(null)
      utils.admin.getDisputedOrders.invalidate()
      utils.admin.getAllOrders.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
      setConfirmAction(null)
    },
  })

  const forceRelease = trpc.admin.forceRelease.useMutation({
    onSuccess: () => {
      toast.success("Plata a fost eliberata si comanda a fost marcata ca livrata.")
      setConfirmAction(null)
      utils.admin.getDisputedOrders.invalidate()
      utils.admin.getAllOrders.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
      setConfirmAction(null)
    },
  })

  const resolveDispute = trpc.admin.resolveDispute.useMutation({
    onSuccess: () => {
      toast.success("Disputa a fost solutionata fara actiuni financiare.")
      setConfirmAction(null)
      utils.admin.getDisputedOrders.invalidate()
      utils.admin.getAllOrders.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
      setConfirmAction(null)
    },
  })

  const isPending = forceReturn.isPending || forceRelease.isPending || resolveDispute.isPending

  const getConfirmDialog = () => {
    if (!confirmAction) return null

    const config = {
      return: {
        title: "Confirma returnarea fortata",
        description:
          "Aceasta actiune va rambursa cumparatorul si va marca comanda ca returnata. Fondurile vor fi trase din escrow inapoi catre cumparator.",
        action: () => forceReturn.mutate({ orderId }),
      },
      release: {
        title: "Confirma eliberarea fortata",
        description:
          "Aceasta actiune va elibera plata catre vanzator si va marca comanda ca livrata. Fondurile vor fi trase din escrow catre vanzator.",
        action: () => forceRelease.mutate({ orderId }),
      },
      resolve: {
        title: "Solutioneaza disputa",
        description:
          "Aceasta actiune va marca comanda ca livrata fara a face modificari financiare. Foloseste aceasta optiune cand disputa este deja rezolvata intre parti sau nu necesita actiuni financiare.",
        action: () => resolveDispute.mutate({ orderId }),
      },
    }

    const c = config[confirmAction]

    return (
      <Dialog open={true} onOpenChange={() => !isPending && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              {c.title}
            </DialogTitle>
            <DialogDescription>{c.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isPending}
            >
              Anuleaza
            </Button>
            <Button
              variant={confirmAction === "return" ? "destructive" : "default"}
              onClick={c.action}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              Confirma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirmAction("return")}
          disabled={isPending}
        >
          {forceReturn.isPending ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <RotateCcw className="mr-1 size-3" />
          )}
          Returnare fortata
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => setConfirmAction("release")}
          disabled={isPending}
        >
          {forceRelease.isPending ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <ShieldAlert className="mr-1 size-3" />
          )}
          Eliberare fortata
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmAction("resolve")}
          disabled={isPending}
        >
          {resolveDispute.isPending ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 size-3" />
          )}
          Solutioneaza
        </Button>
      </div>

      {getConfirmDialog()}
    </>
  )
}
