"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboardIcon,
  UsersIcon,
  PackageIcon,
  ShoppingBagIcon,
  TagsIcon,
  FileTextIcon,
  SettingsIcon,
  LogOutIcon,
  MessageSquareIcon,
  BarChart3Icon,
} from "lucide-react"

const adminLinks = [
  {
    group: "Administrare",
    links: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
      { label: "Utilizatori", href: "/admin/utilizatori", icon: UsersIcon },
      { label: "Categorii", href: "/admin/categorii", icon: TagsIcon },
      { label: "Produse", href: "/admin/produse", icon: PackageIcon },
      { label: "Comenzi", href: "/admin/comenzi", icon: ShoppingBagIcon },
      { label: "Mesaje", href: "/admin/mesaje", icon: MessageSquareIcon },
      { label: "Blog", href: "/admin/blog", icon: FileTextIcon },
      { label: "Rapoarte", href: "/admin/rapoarte", icon: BarChart3Icon },
    ],
  },
  {
    group: "Sistem",
    links: [
      { label: "Setari", href: "/admin/setari", icon: SettingsIcon },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/admin" className="text-lg font-bold tracking-tight">
          Smarty Admin
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {adminLinks.map((group) => (
          <div key={group.group}>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </p>
            {group.links.map((link) => {
              const Icon = link.icon
              const isActive =
                pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(link.href))

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
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <LayoutDashboardIcon className="size-4" />
            Inapoi la site
          </Link>
        </div>
      </nav>
    </aside>
  )
}
