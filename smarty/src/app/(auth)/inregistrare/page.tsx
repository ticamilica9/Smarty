import { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Inregistrare - Smarty' }

export default function RegisterPage() {
  return (
    <main className="container max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-center mb-4">Creeaza cont</h1>
      <p className="text-muted-foreground text-center mb-8">
        Inregistreaza-te pentru a cumpara si vinde pe Smarty
      </p>
      <RegisterForm />
    </main>
  )
}
