import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <Link
        href="/"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Home className="size-4" />
        <span className="sr-only">Acasa</span>
      </Link>
      {items.length > 0 && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
      )}
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        if (isLast || !item.href) {
          return (
            <span key={index} aria-current={isLast ? 'page' : undefined} className="truncate max-w-[200px]">
              {item.label}
            </span>
          )
        }

        return (
          <span key={index} className="flex items-center gap-1 truncate">
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
          </span>
        )
      })}
    </nav>
  )
}
