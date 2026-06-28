'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      toast.error('Credentiale invalide. Accesul este restrictionat pentru administratori.')
    } else {
      window.location.href = '/admin'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1A1015] via-[#2D1820] to-[#3D1A28] px-4">
      <Card className="w-full max-w-md border-border/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
            <Shield className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Admin Smarty</CardTitle>
          <CardDescription>Autentificare rezervată administratorilor platformei</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smarty.ro"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Se verifică...' : 'Autentificare admin'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Nu ești administrator? <a href="/login" className="text-primary hover:underline">Autentificare membri</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
