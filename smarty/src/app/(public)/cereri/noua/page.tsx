'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc/client'
import { formatRON } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewRFQPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const utils = trpc.useUtils()

  const { data: categories } = trpc.category.getAll.useQuery()
  const createRFQ = trpc.rfq.create.useMutation({
    onSuccess: () => {
      toast.success('Cererea ta a fost publicata cu succes!')
      router.push('/cereri')
      utils.rfq.getAll.invalidate()
      utils.rfq.getMyRFQs.invalidate()
    },
    onError: (error) => {
      toast.error(error.message ?? 'A aparut o eroare la crearea cererii')
    },
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [maxBudget, setMaxBudget] = useState('')

  // Not authenticated
  if (!session?.user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="size-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-lg font-semibold">
              Autentifica-te pentru a posta o cerere
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Trebuie sa fii logat pentru a putea crea o cerere de oferta.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push('/login')}
            >
              Intra in cont
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Titlul este obligatoriu')
      return
    }
    if (!description.trim()) {
      toast.error('Descrierea este obligatorie')
      return
    }
    if (!categoryId) {
      toast.error('Selecteaza o categorie')
      return
    }
    if (!maxBudget || parseFloat(maxBudget) <= 0) {
      toast.error('Bugetul trebuie sa fie mai mare de 0')
      return
    }

    createRFQ.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      maxBudget: parseFloat(maxBudget),
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <a
        href="/cereri"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Inapoi la cereri
      </a>

      <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Posteaza o cerere de oferta
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Descrie produsul pe care il cauti si vanzatorii iti vor trimite oferte.
        Cererea expira automat dupa 7 zile.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <Label htmlFor="title">
            Ce produs cauti? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Ruj Maybelline nuanta 100, fond de ten MAC..."
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description">
            Descrie ce ai nevoie <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detaliaza ce produs cauti: brand, nuanta, dimensiune, stare acceptabila, etc."
            rows={5}
            required
          />
        </div>

        {/* Category */}
        <div className="space-y-1">
          <Label htmlFor="category">
            Categorie <span className="text-destructive">*</span>
          </Label>
          <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteaza o categorie" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Max Budget */}
        <div className="space-y-1">
          <Label htmlFor="budget">
            Buget maxim (RON) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            min="0.01"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-muted-foreground">
            Ofertele primite nu vor putea depasi aceasta suma.
            {maxBudget && parseFloat(maxBudget) > 0 && (
              <> Bugetul tau: {formatRON(parseFloat(maxBudget))}.</>
            )}
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/cereri')}
          >
            Anuleaza
          </Button>
          <Button type="submit" disabled={createRFQ.isPending}>
            {createRFQ.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Se publica...
              </>
            ) : null}
            Publica cererea
          </Button>
        </div>
      </form>
    </div>
  )
}
