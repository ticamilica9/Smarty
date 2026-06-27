import { auth } from "@/server/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Panou Administrativ
      </h1>
      <p className="mt-1 text-muted-foreground">
        Bine ai venit in panoul de administrare Smarty.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Utilizatori</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestionare conturi utilizatori
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Comenzi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Vezi si administreaza comenzile
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">Categorii</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Organizare categorii de produse
          </p>
        </div>
      </div>
    </div>
  )
}
