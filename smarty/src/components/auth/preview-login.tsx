'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { IS_PREVIEW_CLIENT } from '@/lib/preview-mode'

const PREVIEW_USERS = {
  user: { email: 'ana@email.com', password: 'demo123', label: 'Intra ca User (Preview)' },
  admin: { email: 'admin@smarty.ro', password: 'admin123', label: 'Intra ca Admin (Preview)' },
} as const

export function PreviewLogin() {
  const [loading, setLoading] = useState<'user' | 'admin' | null>(null)

  if (!IS_PREVIEW_CLIENT) return null

  const handleLogin = async (type: 'user' | 'admin') => {
    setLoading(type)
    const creds = PREVIEW_USERS[type]
    await signIn('credentials', {
      email: creds.email,
      password: creds.password,
      redirect: false,
    })
    window.location.href = '/'
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-800 p-3 text-sm">
        <p className="font-medium text-fuchsia-800 dark:text-fuchsia-200">
          Mod Preview — autentificare rapida
        </p>
        <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 mt-0.5">
          Nu este nevoie de parola. Apasa un buton pentru a intra direct in aplicatie.
        </p>
      </div>

      <Button
        className="w-full"
        variant="default"
        disabled={loading !== null}
        onClick={() => handleLogin('user')}
      >
        {loading === 'user' ? 'Se autentifica...' : PREVIEW_USERS.user.label}
      </Button>

      <Button
        className="w-full"
        variant="outline"
        disabled={loading !== null}
        onClick={() => handleLogin('admin')}
      >
        {loading === 'admin' ? 'Se autentifica...' : PREVIEW_USERS.admin.label}
      </Button>
    </div>
  )
}
