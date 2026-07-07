export const metadata = {
  title: "Setari cont",
  description: "Gestioneaza setarile contului tau pe Smarty Marketplace.",
}

const settingSections = [
  {
    title: "Profil",
    description: "Actualizeaza informatiile personale",
  },
  {
    title: "Notificari",
    description: "Gestioneaza preferintele de notificare",
  },
  {
    title: "Confidentialitate",
    description: "Controleaza cine iti vede profilul",
  },
  {
    title: "Cont",
    description: "Schimba parola sau sterge contul",
  },
]

export default async function SetariPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Setari cont</h1>
      <p className="mt-1 text-muted-foreground">
        Gestioneaza setarile contului tau.
      </p>

      <div className="mt-8 space-y-3">
        {settingSections.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <h3 className="font-medium">{section.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
