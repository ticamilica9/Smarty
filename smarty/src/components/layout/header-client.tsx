"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Session } from "next-auth"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  SearchIcon,
  MenuIcon,
  UserIcon,
  LogOutIcon,
  HeartIcon,
  ShoppingBagIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  PackageIcon,
  PlusCircleIcon,
  StoreIcon,
  ChevronDownIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type User = Session["user"] | null

interface HeaderClientProps {
  user: User
}

const navLinks = [
  { label: "Acasa", href: "/" },
  { label: "Categorii", href: "/categorii" },
  { label: "Oferte", href: "/oferte" },
  { label: "Cereri", href: "/cereri" },
  { label: "RFQ-uri", href: "/rfq-uri" },
  { label: "Blog", href: "/blog" },
]

export function HeaderClient({ user }: HeaderClientProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Meniu">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <SheetTitle className="text-left text-lg">Smarty</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {navLinks.map((link) => (
                <SheetClose key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                      pathname === link.href
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
              <Separator className="my-2" />
              {user ? (
                <>
                  <SheetClose>
                    <Link
                      href="/produse/nou"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      + Vinde
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link
                      href="/cont"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <UserIcon className="size-4" />
                      Contul meu
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link
                      href="/cont/comenzi"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <ShoppingBagIcon className="size-4" />
                      Comenzile mele
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link
                      href="/cont/dorinte"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <HeartIcon className="size-4" />
                      Lista de dorinte
                    </Link>
                  </SheetClose>
                </>
              ) : (
                <>
                  <SheetClose>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="default" className="w-full">
                        Intra in cont
                      </Button>
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link href="/inregistrare" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Creeaza cont
                      </Button>
                    </Link>
                  </SheetClose>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight"
        >
          Smarty
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link href="/produse/nou">
              <Button variant="outline" size="sm" className="ml-2">
                + Vinde
              </Button>
            </Link>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="hidden sm:relative sm:flex sm:items-center">
          <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cauta produse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-44 rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring transition-colors focus:w-64 focus:border-ring focus:ring-1 lg:w-56 lg:focus:w-72"
          />
        </div>

        {/* Right side: auth / user menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="size-8">
                    {user.image ? (
                      <AvatarImage src={user.image} alt={user.name ?? ""} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium lg:inline">
                    {user.name ?? "Utilizator"}
                  </span>
                  <ChevronDownIcon className="hidden size-3.5 text-muted-foreground lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span>{user.name ?? "Utilizator"}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.email ?? ""}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link
                    href="/cont"
                    className="flex w-full items-center gap-2"
                  >
                    <LayoutDashboardIcon className="size-4" />
                    Panou de control
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/cont/comenzi"
                    className="flex w-full items-center gap-2"
                  >
                    <ShoppingBagIcon className="size-4" />
                    Comenzile mele
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/cont/dorinte"
                    className="flex w-full items-center gap-2"
                  >
                    <HeartIcon className="size-4" />
                    Lista de dorinte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/cont/produse"
                    className="flex w-full items-center gap-2"
                  >
                    <PackageIcon className="size-4" />
                    Produsele mele
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/cont/vanzari"
                    className="flex w-full items-center gap-2"
                  >
                    <StoreIcon className="size-4" />
                    Vanzari
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/cont/anunt-nou"
                    className="flex w-full items-center gap-2"
                  >
                    <PlusCircleIcon className="size-4" />
                    Adauga anunt
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link
                    href="/cont/setari"
                    className="flex w-full items-center gap-2"
                  >
                    <SettingsIcon className="size-4" />
                    Setari
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link
                    href="/api/auth/signout"
                    className="flex w-full items-center gap-2"
                  >
                    <LogOutIcon className="size-4" />
                    Iesire
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-clip-padding px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Intra in cont
              </Link>
              <Link
                href="/inregistrare"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-clip-padding px-2.5 text-sm font-medium whitespace-nowrap bg-primary text-primary-foreground transition-colors hover:bg-primary/80 hidden sm:inline-flex"
              >
                Creeaza cont
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
