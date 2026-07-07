export const metadata = {
  title: "Retururi",
  description: "Gestioneaza cererile de retur pentru produsele cumparate.",
}

export default function ReturnsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Retururi</h1>
      <p className="mt-1 text-muted-foreground">
        Gestioneaza cererile de retur pentru produsele cumparate.
      </p>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <h3 className="font-medium">Nu ai nicio cerere de retur.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Daca nu esti multumit de o comanda, poti solicita retur de aici.
        </p>
      </div>
    </div>
  )
}
