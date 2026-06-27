import { auth } from "@/server/auth"
import { redirect } from "next/navigation"
import {
  ShoppingBagIcon,
  HeartIcon,
  PackageIcon,
  MessageSquareIcon,
} from "lucide-react"

const quickLinks = [
  {
    label: "Comenzile mele",
    href: "/cont/comenzi",
    icon: ShoppingBagIcon,
    description: "Vezi istoricul comenzilor tale",
  },
  {
    label: "Lista de dorinte",
    href: "/cont/dorinte",
    icon: HeartIcon,
    description: "Produsele salvate",
  },
  {
    label: "Produsele mele",
    href: "/cont/produse",
    icon: PackageIcon,
    description: "Gestionare anunturi",
  },
  {
    label: "Mesaje",
    href: "/cont/mesaje",
    icon: MessageSquareIcon,
    description: "Conversatii cu vanzatorii",
  },
]

export default async function AccountPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Bun venit, {session.user.name ?? "Utilizator"}!
      </h1>
      <p className="mt-1 text-muted-foreground">
        Panoul tau de control. Aici gasesti toate informatiile despre contul tau.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.href}
              href={link.href}
              className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <Icon className="size-6 text-muted-foreground group-hover:text-foreground" />
              <h3 className="mt-3 font-medium">{link.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {link.description}
              </p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
