export const metadata = {
  title: "Vanzari",
  description: "Monitorizeaza vanzarile tale pe Smarty Marketplace.",
}

export default async function VanzariPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Vanzari</h1>
      <p className="mt-1 text-muted-foreground">
        Monitorizeaza vanzarile tale. Vezi ce produse s-au vandut si castigurile
        tale.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Total vanzari</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">0 RON</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Produse vandute</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">0</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Nu ai nicio vanzare momentan.</p>
      </div>
    </div>
  )
}
