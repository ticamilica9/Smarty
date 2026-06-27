import { auth } from '@/server/auth'
import { redirect } from 'next/navigation'
import { OffersTabs } from '@/components/offer/offers-tabs'

export const metadata = {
  title: 'Ofertele mele | Smarty',
  description: 'Gestionare oferte pe Smarty Marketplace.',
}

export default async function OffersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Oferte</h1>
        <p className="mt-1 text-muted-foreground">
          Trimite oferte, negociaza pretul si accepta contra-oferte.
        </p>
      </div>

      <OffersTabs />
    </div>
  )
}
