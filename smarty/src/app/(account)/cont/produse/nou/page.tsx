import { auth } from '@/server/auth'
import { redirect } from 'next/navigation'
import { ProductForm } from '@/components/product/product-form'

export const metadata = {
  title: 'Adauga produs nou | Smarty',
  description: 'Publica un anunt nou pe Smarty Marketplace.',
}

export default async function NewProductPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Adauga un produs nou</h1>
        <p className="mt-1 text-muted-foreground">
          Completeaza detaliile de mai jos pentru a publica un anunt.
        </p>
      </div>

      <ProductForm />
    </div>
  )
}
