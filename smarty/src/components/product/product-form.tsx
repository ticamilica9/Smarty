'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { trpc } from '@/lib/trpc/client'
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

const conditions = [
  { value: 'NEW', label: 'Nou' },
  { value: 'LIKE_NEW', label: 'Ca nou' },
  { value: 'GOOD', label: 'Bun' },
  { value: 'FAIR', label: 'Satisfacator' },
]

export function ProductForm() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: categories } = trpc.category.getAll.useQuery()
  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => {
      toast.success('Produsul a fost creat cu succes!')
      router.push('/cont/produse')
      utils.product.getMyProducts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message ?? 'A aparut o eroare la crearea produsului')
    },
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState('NEW')
  const [price, setPrice] = useState('')
  const [brand, setBrand] = useState('')
  const [shade, setShade] = useState('')
  const [skinType, setSkinType] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [acceptTrade, setAcceptTrade] = useState(false)
  const [tradeInterests, setTradeInterests] = useState('')
  const [acceptMoneyDifference, setAcceptMoneyDifference] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Eroare la upload' }))
          throw new Error(err.error)
        }
        const data = await res.json()
        uploaded.push(data.url)
      }
      setImages((prev) => [...prev, ...uploaded])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la incarcarea imaginilor')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
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
    if (!price || parseFloat(price) <= 0) {
      toast.error('Pretul trebuie sa fie mai mare de 0')
      return
    }

    createProduct.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      condition: condition as 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR',
      price: parseFloat(price),
      brand: brand.trim() || undefined,
      shade: shade.trim() || undefined,
      skinType: skinType.trim() || undefined,
      images,
      acceptTrade,
      tradeInterests: acceptTrade ? tradeInterests.trim() || undefined : undefined,
      acceptMoneyDifference: acceptTrade ? acceptMoneyDifference : false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image upload */}
      <div className="space-y-2">
        <Label>Imagini</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="group relative size-24 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Sterge imaginea"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex size-24 cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors hover:bg-muted"
            aria-label="Adauga imagine"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
        <p className="text-xs text-muted-foreground">
          Adauga pana la 10 imagini. Prima imagine va fi cea principala.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title">
          Titlu <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Ruj MAC Retro Matte - Ruby Woo"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">
          Descriere <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrie produsul in detaliu: starea, motivul vanzarii, defecte (daca exista)..."
          rows={4}
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
            {categories?.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Condition */}
      <div className="space-y-1">
        <Label htmlFor="condition">
          Stare <span className="text-destructive">*</span>
        </Label>
        <Select value={condition} onValueChange={(v) => v && setCondition(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conditions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price */}
      <div className="space-y-1">
        <Label htmlFor="price">
          Pret (RON) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {/* Trade / Schimb */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="text-sm font-semibold">Schimb</span>
        </div>

        {/* Accept trade toggle */}
        <div className="space-y-2">
          <Label>Accepti schimbul de produse?</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="acceptTrade"
                checked={acceptTrade}
                onChange={() => setAcceptTrade(true)}
                className="size-4 accent-primary"
              />
              <span className="text-sm">Accept schimb</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="acceptTrade"
                checked={!acceptTrade}
                onChange={() => {
                  setAcceptTrade(false)
                  setTradeInterests('')
                  setAcceptMoneyDifference(false)
                }}
                className="size-4 accent-primary"
              />
              <span className="text-sm">Nu accept schimb</span>
            </label>
          </div>
        </div>

        {/* Conditional trade fields */}
        {acceptTrade && (
          <>
            <div className="space-y-1">
              <Label htmlFor="tradeInterests">Ce ma intereseaza la schimb?</Label>
              <Textarea
                id="tradeInterests"
                value={tradeInterests}
                onChange={(e) => setTradeInterests(e.target.value)}
                placeholder="Ex: Rujuri MAC nuante inchise, palete farduri, parfumuri..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Optional — descrie ce tip de produse ai accepta la schimb.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pot oferi diferenta de bani?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="moneyDifference"
                    checked={acceptMoneyDifference}
                    onChange={() => setAcceptMoneyDifference(true)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Da</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="moneyDifference"
                    checked={!acceptMoneyDifference}
                    onChange={() => setAcceptMoneyDifference(false)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Nu</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Optional fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: MAC, NARS"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shade">Nuanta</Label>
          <Input
            id="shade"
            value={shade}
            onChange={(e) => setShade(e.target.value)}
            placeholder="Ex: #42, Ruby Woo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="skinType">Tip tenie</Label>
          <Input
            id="skinType"
            value={skinType}
            onChange={(e) => setSkinType(e.target.value)}
            placeholder="Ex: Grasa, Mixta"
          />
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={createProduct.isPending} className="w-full sm:w-auto">
        {createProduct.isPending ? 'Se creaza...' : 'Publica anuntul'}
      </Button>
    </form>
  )
}
