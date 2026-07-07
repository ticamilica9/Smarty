import Link from "next/link"

export const metadata = {
  title: "Comenzile mele",
  description: "Istoricul comenzilor tale.",
}

export default async function ComenziPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Comenzile mele</h1>
      <p className="mt-1 text-muted-foreground">
        Istoricul comenzilor tale. Vezi statusul si detaliile fiecarei comenzi.
      </p>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Nu ai nicio comanda inca.</p>
        <Link
          href="/produse"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Exploreaza produse
        </Link>
      </div>
    </div>
  )
}
