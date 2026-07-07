export const metadata = {
  title: "Portofel",
  description: "Gestioneaza balanta si metodele de plata.",
}

export default function WalletPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Portofel</h1>
      <p className="mt-1 text-muted-foreground">
        Gestioneaza balanta si metodele de plata.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Balanta disponibila</p>
          <p className="mt-1 text-3xl font-bold">0 RON</p>
        </div>
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Functia de portofel va fi disponibila in curand.
          </p>
        </div>
      </div>
    </div>
  )
}
