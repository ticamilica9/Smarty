export const metadata = {
  title: "Profilul meu",
  description: "Informatiile tale publice si setarile profilului.",
}

export default async function ProfilPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Profilul meu</h1>
      <p className="mt-1 text-muted-foreground">
        Informatiile tale publice si setarile profilului.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Nume</p>
          <p className="mt-1 font-medium">—</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="mt-1 font-medium">—</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">
          Profilul tau va aparea aici.
        </p>
      </div>
    </div>
  )
}
