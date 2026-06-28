import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'

import { auth } from '@/server/auth'
import WishlistClient from './wishlist-client'

export default async function WishlistPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Heart className="size-6" />
          Wishlist
        </h1>
        <p className="mt-1 text-muted-foreground">
          Produsele salvate pentru mai tarziu.
        </p>
      </div>

      <WishlistClient />
    </div>
  )
}
