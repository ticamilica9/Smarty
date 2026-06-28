import Link from "next/link"
import { Package, Handshake, Truck, ArrowRight } from "lucide-react"

import { api } from "@/lib/trpc/server"
import { formatRON } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductCard } from "@/components/product/product-card"

async function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  return Promise.race([promise.catch(() => fallback), timeout])
}

export default async function HomePage() {
  const caller = await api()

  const [categories, latestProducts, activeRfqs] = await Promise.all([
    withTimeout(caller.category.getAll({ parentId: null }), [], 5000),
    withTimeout(caller.product.getLatest({ limit: 8 }), [], 5000),
    withTimeout(caller.rfq.getAll({ limit: 4 }), { rfqs: [], total: 0 }, 5000),
  ])

  const displayCategories = (categories || []).slice(0, 5)

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="hero-gradient relative overflow-hidden px-6 py-24 text-white sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.10)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Gasesti ce iti doresti, la pretul potrivit
          </h1>
          <p className="mt-6 text-lg text-white/80 sm:text-xl">
            Smarty este platforma unde cumperi si vinzi produse cosmetice, haine
            si accesorii — noi sau second-hand, la alegere.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/categorii">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                Exploreaza produse
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
            <Link href="/cereri/noua">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                Posteaza o cerere
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Categorii</h2>
              <p className="mt-2 text-muted-foreground">
                Alege din gama noastra variata de produse
              </p>
            </div>
            <Link
              href="/categorii"
              className="hidden items-center gap-1 text-sm font-medium text-foreground hover:underline sm:inline-flex"
            >
              Toate categoriile
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {displayCategories.map((category: any) => (
              <Link
                key={category.id}
                href={`/categorii/${category.slug}`}
                className="group rounded-xl border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-md"
              >
                <span className="inline-block text-4xl transition-transform duration-300 group-hover:scale-110">
                  {category.icon ?? "📦"}
                </span>
                <h3 className="mt-3 font-medium">{category.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {category._count.products} produse
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link href="/categorii">
              <Button variant="ghost">
                Toate categoriile
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Active RFQs ── */}
      {activeRfqs.rfqs.length > 0 && (
        <section className="bg-muted/30 px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Cereri active
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Cumparatorii cauta aceste produse
                </p>
              </div>
              <Link
                href="/cereri"
                className="hidden items-center gap-1 text-sm font-medium text-foreground hover:underline sm:inline-flex"
              >
                Toate cererile
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {activeRfqs.rfqs.slice(0, 4).map((rfq: any) => (
                <Link key={rfq.id} href={`/cereri/${rfq.id}`}>
                  <Card className="transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="grid gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-1">
                          {rfq.title}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {rfq._count.offers} oferte
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {rfq.description}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-semibold">
                          Buget: {formatRON(rfq.maxBudget)}
                        </span>
                        {rfq.category && (
                          <span className="text-xs text-muted-foreground">
                            {rfq.category.name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Link href="/cereri">
                <Button variant="ghost">
                  Toate cererile
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Products ── */}
      {latestProducts.length > 0 && (
        <section className="px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Ultimele produse
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Cele mai noi produse adaugate de vanzatori
                </p>
              </div>
              <Link
                href="/categorii"
                className="hidden items-center gap-1 text-sm font-medium text-foreground hover:underline sm:inline-flex"
              >
                Vezi toate
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {latestProducts.slice(0, 8).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showSeller={false}
                />
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/categorii">
                <Button>
                  Vezi toate produsele
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="bg-gradient-to-b from-muted/30 to-background px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Cum functioneaza
          </h2>
          <p className="mt-2 text-muted-foreground">
            Trei pasi simpli pentru a cumpara sau vinde pe Smarty
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                <Package className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">Posteaza</h3>
              <p className="text-sm text-muted-foreground">
                Adauga produsul tau sau creeaza o cerere pentru ce anume cauti.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-foreground">
                <Handshake className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">Negociaza</h3>
              <p className="text-sm text-muted-foreground">
                Comunica direct cu cumparatori sau vanzatori si negociaza
                pretul.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Truck className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">Primeste</h3>
              <p className="text-sm text-muted-foreground">
                Plateste in siguranta si primesti produsul acasa sau in EasyBox.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
