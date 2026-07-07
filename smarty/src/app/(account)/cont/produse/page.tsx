import Link from "next/link"

export const metadata = {
  title: "Produsele mele",
  description: "Gestionare anunturilor tale.",
}

export default async function ProdusePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Produsele mele</h1>
      <p className="mt-1 text-muted-foreground">
        Gestionare anunturilor publicate de tine.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="font-medium">Produse active</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-medium">Produse vandute</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>

      <Link
        href="/cont/produse/nou"
        className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        Adauga anunt nou
      </Link>
    </div>
  )
}
