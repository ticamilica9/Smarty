import { redirect } from "next/navigation"
import { auth } from "@/server/auth"
import { CheckoutForm } from "./checkout-form"

export default async function CheckoutPage(props: {
  searchParams?: Promise<{ productId?: string; offerId?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login?redirect=/checkout")
  }

  const searchParams = await props.searchParams ?? {}
  const productId = searchParams.productId
  const offerId = searchParams.offerId

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-semibold">Finalizare comanda</h1>
      <CheckoutForm
        userId={session.user.id}
        productId={productId}
        offerId={offerId}
      />
    </div>
  )
}
