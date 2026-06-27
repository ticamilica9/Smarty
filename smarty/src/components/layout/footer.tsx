import Link from "next/link"

const footerLinks = [
  {
    title: "Smarty",
    links: [
      { label: "Despre noi", href: "/despre" },
      { label: "Cariere", href: "/cariere" },
      { label: "Presa", href: "/presa" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Ajutor",
    links: [
      { label: "Intrebari frecvente", href: "/ajutor" },
      { label: "Cum cumpar", href: "/ajutor/cum-cumpar" },
      { label: "Cum vand", href: "/ajutor/cum-vand" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termeni si conditii", href: "/legal/termeni" },
      { label: "Politica de confidentialitate", href: "/legal/confidentialitate" },
      { label: "Politica de retur", href: "/legal/retur" },
      { label: "GDPR", href: "/legal/gdpr" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              Smarty
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Platforma de cumparare si vanzare produse second-hand, noi si colectii
              limitate. Gasesti tot ce ai nevoie la preturi bune.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Smarty. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  )
}
