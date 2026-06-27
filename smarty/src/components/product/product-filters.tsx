'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn, conditionLabel } from '@/lib/utils'

const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const

const PRICE_RANGES = [
  { label: 'Sub 50 RON', min: 0, max: 50 },
  { label: '50 - 100 RON', min: 50, max: 100 },
  { label: '100 - 200 RON', min: 100, max: 200 },
  { label: 'Peste 200 RON', min: 200, max: undefined },
] as const

interface ProductFiltersProps {
  className?: string
}

export function ProductFilters({ className }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeConditions = searchParams.getAll('stare')
  const activePriceMin = searchParams.get('pretMin')
  const activePriceMax = searchParams.get('pretMax')

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (name === 'stare') {
        const current = params.getAll('stare')
        if (current.includes(value)) {
          params.delete('stare')
          current.filter((v) => v !== value).forEach((v) => params.append('stare', v))
        } else {
          params.append('stare', value)
        }
      } else if (name === 'pret') {
        // value is "min-max" or "min-"
        const [min, max] = value.split('-')
        if (min) params.set('pretMin', min)
        else params.delete('pretMin')
        if (max) params.set('pretMax', max)
        else params.delete('pretMax')
      }

      params.delete('page')
      return params.toString()
    },
    [searchParams],
  )

  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const hasActiveFilters = activeConditions.length > 0 || activePriceMin || activePriceMax

  return (
    <aside className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtre</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            className="h-auto px-1 text-xs text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="mr-1 size-3" />
            Sterge filtrele
          </Button>
        )}
      </div>

      <Separator />

      {/* Condition filter */}
      <div>
        <h4 className="mb-3 text-sm font-medium">Starea produsului</h4>
        <div className="space-y-2">
          {CONDITIONS.map((cond) => {
            const isActive = activeConditions.includes(cond)
            return (
              <button
                key={cond}
                onClick={() => {
                  router.push(`${pathname}?${createQueryString('stare', cond)}`)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  isActive && 'bg-muted font-medium',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-xs border',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {isActive && (
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {conditionLabel(cond)}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Price filter */}
      <div>
        <h4 className="mb-3 text-sm font-medium">Pret</h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => {
            const isActive =
              activePriceMin === String(range.min) &&
              (range.max === undefined
                ? !activePriceMax
                : activePriceMax === String(range.max))

            const value = range.max === undefined ? `${range.min}-` : `${range.min}-${range.max}`

            return (
              <button
                key={value}
                onClick={() => {
                  router.push(`${pathname}?${createQueryString('pret', value)}`)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  isActive && 'bg-muted font-medium',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-xs border',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {isActive && (
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {range.label}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
