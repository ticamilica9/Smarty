import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, Clock, CheckCircle, Shield, RefreshCw } from "lucide-react"

import { Breadcrumbs } from "@/components/ui/breadcrumbs"

interface PaginaProps {
  params: Promise<{ slug: string }>
}

interface PaginaContent {
  title: string
  description?: string
}

const paginiMap: Record<string, PaginaContent> = {
  despre: {
    title: "Despre Smarty",
  },
  contact: {
    title: "Contact",
  },
  "cum-functioneaza": {
    title: "Cum funcționează",
  },
  termeni: {
    title: "Termeni și condiții",
  },
  "politica-retur": {
    title: "Politica de retur",
  },
}

export default async function PaginaPage({ params }: PaginaProps) {
  const { slug } = await params
  const pagina = paginiMap[slug]

  if (!pagina) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: pagina.title },
        ]}
        className="mb-6"
      />

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {pagina.title}
          </h1>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:scroll-m-20 prose-headings:font-semibold prose-headings:tracking-tight
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2
          prose-p:leading-7 prose-p:mb-4
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:font-semibold
          prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
          prose-li:my-1
          prose-hr:border-border
        ">

          {slug === "despre" && <DespreContent />}
          {slug === "contact" && <ContactContent />}
          {slug === "cum-functioneaza" && <CumFunctioneazaContent />}
          {slug === "termeni" && <TermeniContent />}
          {slug === "politica-retur" && <PoliticaReturContent />}

        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Înapoi la pagina principală
          </Link>
        </div>
      </article>
    </div>
  )
}

function DespreContent() {
  return (
    <>
      <p className="lead text-lg text-muted-foreground">
        Smarty este un marketplace dedicat produselor cosmetice, de îngrijire și parfumurilor.
      </p>
      <p>
        Misiunea noastră este să oferim o platformă sigură și elegantă unde pasionații de beauty
        pot cumpăra și vinde produse autentice. Credem că frumusețea ar trebui să fie accesibilă
        tuturor, iar produsele beauty prea puțin folosite merită o a doua șansă.
      </p>
      <p>
        Pe Smarty, vei găsi o comunitate de beauty entuziaști care împărtășesc aceeași pasiune
        pentru produse cosmetice de calitate. Fie că ești în căutarea unui ruj de ediție limitată,
        a unui parfum iconic sau a unui serum de îngrijire, cu siguranță vei găsi ceva special.
      </p>
      <h2>De ce Smarty?</h2>
      <ul>
        <li><strong>Autenticitate garantată</strong> — toate produsele sunt verificate de comunitate</li>
        <li><strong>Prețuri corecte</strong> — produse premium la prețuri accesibile</li>
        <li><strong>Comunitate activă</strong> — peste 10.000 de membri activi</li>
        <li><strong>Plată sigură</strong> — tranzacții protejate prin platformă</li>
      </ul>
    </>
  )
}

function ContactContent() {
  return (
    <>
      <p className="lead text-lg text-muted-foreground">
        Suntem aici pentru tine! Nu ezita să ne contactezi pentru orice întrebare sau nelămurire.
      </p>

      <h2>Informații de contact</h2>

      <div className="not-prose mt-6 space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-5 text-primary shrink-0" />
          <div>
            <p className="font-medium">Email</p>
            <a href="mailto:contact@smarty.ro" className="text-sm text-muted-foreground hover:text-primary">
              contact@smarty.ro
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-5 text-primary shrink-0" />
          <div>
            <p className="font-medium">Telefon</p>
            <p className="text-sm text-muted-foreground">+40 7XX XXX XXX</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 text-primary shrink-0" />
          <div>
            <p className="font-medium">Program</p>
            <p className="text-sm text-muted-foreground">Luni - Vineri: 09:00 - 18:00</p>
            <p className="text-sm text-muted-foreground">Sâmbătă - Duminică: Închis</p>
          </div>
        </div>
      </div>

      <h2>Suport clienți</h2>
      <p>
        Echipa noastră de suport răspunde în maxim 24 de ore în zilele lucrătoare.
        Pentru întrebări legate de comenzi, livrări sau produse, te rugăm să ne scrii
        la adresa de email de mai sus.
      </p>
    </>
  )
}

function CumFunctioneazaContent() {
  return (
    <>
      <p className="lead text-lg text-muted-foreground">
        Smarty face cumpărăturile și vânzările de produse beauty simple și sigure.
      </p>

      <div className="not-prose mt-10 space-y-12">
        {/* Step 1 */}
        <div className="flex gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xl font-bold text-primary">1</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Postează</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Creează un anunț pentru produsul pe care vrei să îl vinzi. Adaugă poze clare,
              descrie starea produsului și stabilește un preț corect. Poți posta atât produse
              noi, cât și produse ușor folosite.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xl font-bold text-primary">2</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Negociază</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Comunică direct cu cumpărătorii sau vânzătorii prin platformă. Negociază prețul,
              stabilește detaliile livrării și asigură-te că toți termenii sunt clari înainte
              de a finaliza tranzacția.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xl font-bold text-primary">3</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Primește</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              După finalizarea plății, primești produsul acasă, prin curier. Verifică produsul
              la primire și confirmă că totul este în regulă. Evaluează experiența și ajută
              comunitatea să crească!
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function TermeniContent() {
  return (
    <>
      <p className="lead text-lg text-muted-foreground">
        Acești termeni și condiții reglementează utilizarea platformei Smarty Marketplace.
      </p>

      <h2>1. Acceptarea termenilor</h2>
      <p>
        Prin crearea unui cont și utilizarea platformei Smarty, ești de acord cu prezentii
        termeni și condiții. Dacă nu ești de acord cu acești termeni, te rugăm să nu utilizezi
        platforma.
      </p>

      <h2>2. Conturi de utilizator</h2>
      <p>
        Pentru a utiliza platforma, trebuie să îți creezi un cont. Ești responsabil pentru
        confidențialitatea datelor tale de autentificare și pentru toate activitățile care
        au loc sub contul tău.
      </p>
      <ul>
        <li>Trebuie să ai cel puțin 18 ani pentru a utiliza platforma</li>
        <li>Informațiile furnizate trebuie să fie corecte și complete</li>
        <li>Nu poți crea mai multe conturi fără acordul nostru</li>
      </ul>

      <h2>3. Produse și tranzacții</h2>
      <p>
        Smarty oferă o platformă de intermediere între cumpărători și vânzători. Nu suntem
        proprietarii produselor listate și nu garantăm calitatea acestora.
      </p>
      <ul>
        <li>Vânzătorii sunt responsabili pentru autenticitatea produselor</li>
        <li>Prețurile sunt stabilite exclusiv de vânzători</li>
        <li>Smarty percepe un comision pentru fiecare tranzacție finalizată</li>
      </ul>

      <h2>4. Confidențialitate</h2>
      <p>
        Prelucrăm datele personale în conformitate cu Regulamentul General privind Protecția
        Datelor (GDPR). Vezi Politica de confidențialitate pentru detalii complete.
      </p>

      <h2>5. Modificări</h2>
      <p>
        Ne rezervăm dreptul de a modifica acești termeni în orice moment. Utilizatorii vor
        fi notificați cu privire la modificări majore prin email.
      </p>
    </>
  )
}

function PoliticaReturContent() {
  return (
    <>
      <p className="lead text-lg text-muted-foreground">
        Politica noastră de retur îți oferă protecție și încredere în fiecare achiziție.
      </p>

      <h2>Perioada de retur</h2>
      <p>
        Ai la dispoziție <strong>14 zile</strong> de la primirea produsului pentru a solicita
        returnarea acestuia, în conformitate cu legislația în vigoare privind vânzările
        la distanță.
      </p>

      <h2>Condiții de returnare</h2>
      <ul>
        <li>Produsul trebuie să fie în aceeași stare în care a fost primit</li>
        <li>Ambalajul original trebuie să fie intact</li>
        <li>Produsele sigilate (sigiliu rupt) nu pot fi returnate din motive de igienă</li>
        <li>Costurile de returnare sunt suportate de cumpărător, cu excepția cazurilor în care produsul este diferit de descriere</li>
      </ul>

      <h2>Excepții</h2>
      <p>Următoarele produse nu pot fi returnate:</p>
      <ul>
        <li>Produsele de igienă personală cu sigiliul rupt</li>
        <li>Parfumurile și spray-urile cu sigiliul rupt</li>
        <li>Produsele personalizate</li>
        <li>Produsele declarate ca având discount final (sold finale)</li>
      </ul>

      <h2>Cum returnezi un produs</h2>
      <ol>
        <li>Accesează secțiunea "Comenzile mele" din contul tău</li>
        <li>Selectează comanda și produsul pe care dorești să îl returnezi</li>
        <li>Completează formularul de retur cu motivul returnării</li>
        <li>Ambalază produsul în ambalajul original</li>
        <li>Expediază coletul la adresa primită prin email</li>
      </ol>

      <h2>Procesarea returnării</h2>
      <p>
        După primirea coletului returnat și verificarea stării produsului, rambursarea se
        efectuează în maxim 14 zile lucrătoare, prin aceeași metodă de plată utilizată
        la achiziție.
      </p>
    </>
  )
}
