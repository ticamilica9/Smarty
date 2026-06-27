import Link from "next/link"

const footerColumns = [
  {
    title: "Smarty",
    links: [
      { label: "Despre noi", href: "/despre" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Cumparaturi",
    links: [
      { label: "Makeup", href: "/categorii/makeup" },
      { label: "Ingrijire", href: "/categorii/ingrijire" },
      { label: "Haine", href: "/categorii/haine" },
    ],
  },
  {
    title: "Ajutor",
    links: [
      { label: "Cum functioneaza", href: "/ajutor/cum-functioneaza" },
      { label: "Termeni si conditii", href: "/legal/termeni" },
      { label: "Politica de retur", href: "/legal/retur" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
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

          {/* Contact column */}
          <div>
            <h3 className="text-sm font-semibold">Contact</h3>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-muted-foreground">
                contact@smarty.ro
              </li>
              <li className="text-sm text-muted-foreground">
                L-V: 09:00 - 18:00
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-center text-xs text-muted-foreground">
            &copy; 2026 Smarty Marketplace. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  )
}
