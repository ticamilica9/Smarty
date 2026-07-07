import Link from "next/link"

export const metadata = {
  title: "Lista de dorinte",
  description: "Produsele tale salvate.",
}

export default async function DorintePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Lista de dorinte</h1>
      <p className="mt-1 text-muted-foreground">
        Produsele pe care le-ai salvat pentru mai tarziu.
      </p>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">
          Nu ai produse in lista de dorinte.
        </p>
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
