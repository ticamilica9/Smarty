"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Users,
  Search,
  Loader2,
  Ban,
  CheckCircle2,
  Shield,
  UserCog,
  Trash2,
  ShieldAlert,
  Mail,
  Star,
  CalendarDays,
} from "lucide-react"

import { trpc } from "@/lib/trpc/client"
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

type UserData = {
  id: string
  name: string
  email: string
  image: string | null
  buyerRating: number
  sellerRating: number
  role: string
  status?: string
  createdAt?: Date | string
}

export default function AdminUtilizatoriPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)

  const { data, isLoading } = trpc.admin.getUsers.useQuery({
    search: search || undefined,
    limit: 100,
  })

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      utils.admin.getUsers.invalidate()
      utils.admin.getDashboardStats.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Utilizatorul a fost sters cu succes.")
      setDeleteTarget(null)
      utils.admin.getUsers.invalidate()
      utils.admin.getDashboardStats.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
      setDeleteTarget(null)
    },
  })

  const handleBanToggle = (user: UserData) => {
    const newStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED"
    updateUser.mutate({ userId: user.id, status: newStatus })
    toast.success(
      newStatus === "BANNED"
        ? `Utilizatorul ${user.name} a fost blocat.`
        : `Utilizatorul ${user.name} a fost deblocat.`,
    )
  }

  const handleRoleToggle = (user: UserData) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN"
    updateUser.mutate({ userId: user.id, role: newRole })
    toast.success(
      newRole === "ADMIN"
        ? `${user.name} este acum administrator.`
        : `${user.name} este acum utilizator.`,
    )
  }

  const users = data?.users ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilizatori</h1>
          <p className="text-sm text-muted-foreground">
            Gestioneaza toti utilizatorii platformei
          </p>
        </div>
      </div>

      {/* Search & count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa nume sau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} utilizator{(data.total !== 1 ? "i" : "")} gasit{(data.total !== 1 ? "i" : "")}
          </span>
        )}
      </div>

      {/* Users table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nume</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inregistrat</TableHead>
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

            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Nu exista utilizatori.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              users.map((user: UserData) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="size-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role === "ADMIN" ? "Admin" : "Utilizator"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <span>{(user.buyerRating ?? 0).toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "BANNED"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {user.status === "BANNED" ? "Blocat" : "Activ"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("ro-RO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBanToggle(user)}
                        disabled={updateUser.isPending}
                        title={user.status === "BANNED" ? "Deblocheaza" : "Blocheaza"}
                      >
                        {user.status === "BANNED" ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Ban className="size-4 text-destructive" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRoleToggle(user)}
                        disabled={updateUser.isPending}
                        title={user.role === "ADMIN" ? "Fă utilizator" : "Fă admin"}
                      >
                        <UserCog className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(user)}
                        disabled={deleteUser.isPending}
                        title="Sterge utilizator"
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
              Esti sigur ca doresti sa stergi utilizatorul{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              Aceasta actiune este ireversibila si va sterge toate datele
              asociate acestui cont.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
            >
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUser.mutate({ userId: deleteTarget.id })}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Sterge utilizatorul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
