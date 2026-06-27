export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 sm:items-start">
        <h1 className="text-4xl font-bold tracking-tight">
          Bun venit pe Smarty
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Platforma de cumparare si vanzare produse second-hand, noi si colectii limitate.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/categorii"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Exploreaza produse
          </a>
          <a
            href="/inregistrare"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-muted"
          >
            Creeaza cont
          </a>
        </div>
      </div>
    </div>
  )
}
