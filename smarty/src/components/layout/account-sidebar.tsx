"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboardIcon,
  ShoppingBagIcon,
  HeartIcon,
  PackageIcon,
  StoreIcon,
  PlusCircleIcon,
  UserIcon,
  SettingsIcon,
  MessageSquareIcon,
  LogOutIcon,
} from "lucide-react"

const sidebarLinks = [
  {
    group: "General",
    links: [
      { label: "Panou de control", href: "/cont", icon: LayoutDashboardIcon },
      { label: "Profil", href: "/cont/profil", icon: UserIcon },
      { label: "Setari", href: "/cont/setari", icon: SettingsIcon },
    ],
  },
  {
    group: "Cumparaturi",
    links: [
      { label: "Comenzile mele", href: "/cont/comenzi", icon: ShoppingBagIcon },
      { label: "Lista de dorinte", href: "/cont/dorinte", icon: HeartIcon },
      { label: "Mesaje", href: "/cont/mesaje", icon: MessageSquareIcon },
    ],
  },
  {
    group: "Vanzari",
    links: [
      { label: "Produsele mele", href: "/cont/produse", icon: PackageIcon },
      { label: "Adauga anunt", href: "/cont/anunt-nou", icon: PlusCircleIcon },
      { label: "Vanzari", href: "/cont/vanzari", icon: StoreIcon },
    ],
  },
]

export function AccountSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 md:block">
      <nav className="flex flex-col gap-1 p-4">
        {sidebarLinks.map((group) => (
          <div key={group.group}>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </p>
            {group.links.map((link) => {
              const Icon = link.icon
              const isActive =
                pathname === link.href ||
                (link.href !== "/cont" && pathname.startsWith(link.href))

              return (
                <Link key={link.href} href={link.href}>
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {link.label}
                  </span>
                </Link>
              )
            })}
            <Separator className="my-2" />
          </div>
        ))}

        <div className="mt-auto pt-4">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <LogOutIcon className="size-4" />
            Iesire
          </Link>
        </div>
      </nav>
    </aside>
  )
}
