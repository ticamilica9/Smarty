import { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Autentificare - Smarty' }

export default function LoginPage() {
  return (
    <main className="container max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">Intra in cont</h1>
      <LoginForm />
    </main>
  )
}
