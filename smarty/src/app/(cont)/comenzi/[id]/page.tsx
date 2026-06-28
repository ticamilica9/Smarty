import { auth } from '@/server/auth'
import { redirect } from 'next/navigation'
import { OrderDetail } from './order-detail'

export const metadata = {
  title: 'Detalii comanda | Smarty',
  description: 'Vezi detaliile comenzii tale.',
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <OrderDetail orderId={id} userId={session.user.id} />
    </div>
  )
}
