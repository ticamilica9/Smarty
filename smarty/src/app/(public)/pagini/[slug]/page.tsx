import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, Clock, CheckCircle, Shield, RefreshCw, Package, AlertTriangle, ClipboardList, Truck, Ban } from "lucide-react"

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
  confidentialitate: {
    title: "Politica de confidențialitate (GDPR)",
  },
  cookie: {
    title: "Politica privind cookie-urile",
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
          {slug === "confidentialitate" && <GDPRContent />}
          {slug === "cookie" && <CookieContent />}

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
    <div className="not-prose space-y-10">
      {/* Intro */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-1 size-6 text-primary shrink-0" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Politica noastră de retur îți oferă protecție și încredere în fiecare achiziție.
            </p>
            <p className="mt-1 text-muted-foreground">
              Ne dorim să fii complet mulțumit de produsele achiziționate prin Smarty. Dacă ceva nu corespunde așteptărilor, suntem aici să te ajutăm.
            </p>
          </div>
        </div>
      </div>

      {/* Perioada */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Perioada de retur</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Ai la dispoziție <strong className="text-foreground">14 zile</strong> de la data la care ai primit produsul pentru a solicita returnarea acestuia, în conformitate cu legislația privind vânzările la distanță. Perioada se calculează din ziua următoare recepționării coletului.
        </p>
      </div>

      {/* Condiții */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="size-5 text-success" />
          <h2 className="text-xl font-semibold">Condiții de returnare</h2>
        </div>
        <ul className="space-y-3">
          {[
            "Produsul trebuie să fie în aceeași stare în care a fost primit, fără urme de utilizare suplimentară",
            "Ambalajul original trebuie să fie intact și să conțină toate accesoriile primite",
            "Produsele cosmetice cu sigiliul de igienă rupt nu pot fi returnate din motive de protecție sanitară",
            "Costurile de transport pentru retur sunt suportate de cumpărător, cu excepția cazurilor în care produsul nu corespunde descrierii din anunț",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <CheckCircle className="mt-0.5 size-4 text-success shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Excepții */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ban className="size-5 text-destructive" />
          <h2 className="text-xl font-semibold">Excepții — Nu se pot returna</h2>
        </div>
        <ul className="space-y-3">
          {[
            "Produsele de igienă personală și cosmeticele cu sigiliul de securitate rupt",
            "Parfumurile, spray-urile și deodorantele al căror sigiliu a fost deschis",
            "Produsele personalizate sau realizate la comandă specială",
            'Produsele marcate ca "vanzare finala" sau "sold final" la momentul achizitiei',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 text-destructive/70 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cum returnezi */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Package className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Cum returnezi un produs</h2>
        </div>
        <div className="space-y-4">
          {[
            { step: 1, icon: ClipboardList, text: 'Accesează secțiunea "Comenzile mele" din contul tău Smarty' },
            { step: 2, icon: Package, text: "Selectează comanda și produsul pe care dorești să îl returnezi" },
            { step: 3, icon: CheckCircle, text: "Completează formularul de retur, specificând motivul returnării" },
            { step: 4, icon: Package, text: "Ambalază produsul în siguranță, preferabil în ambalajul original" },
            { step: 5, icon: Truck, text: "Expediază coletul la adresa indicată în email-ul de confirmare a returului" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 rounded-lg bg-muted/40 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">{item.step}</span>
              </div>
              <p className="pt-1.5 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Procesare */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Procesarea returnării</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          După ce primim coletul returnat și verificăm starea produsului, rambursarea se efectuează în <strong className="text-foreground">maxim 14 zile lucrătoare</strong>. Suma va fi returnată prin aceeași metodă de plată utilizată la achiziție.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Vei primi notificări prin email la fiecare pas al procesului: confirmarea cererii de retur, primirea coletului și efectuarea rambursării.
        </p>
      </div>
    </div>
  )
}

function GDPRContent() {
  return (
    <div className="not-prose space-y-8">
      <p className="text-lg text-muted-foreground leading-relaxed">
        La Smarty, protejarea datelor tale personale este o prioritate. Această politică descrie modul în care colectăm, utilizăm și protejăm informațiile tale, în conformitate cu GDPR.
      </p>
      {[
        { title: "Ce date colectăm", items: ["Nume, prenume și adresă de email", "Număr de telefon (opțional, pentru livrări)", "Adresa de livrare", "Istoricul comenzilor și tranzacțiilor", "Date de navigare (cookie-uri, IP, dispozitiv)"] },
        { title: "Scopul colectării", items: ["Procesarea comenzilor și comunicarea cu tine", "Îmbunătățirea experienței pe platformă", "Respectarea obligațiilor legale (facturare, garanții)", "Marketing — doar cu acordul tău explicit"] },
        { title: "Drepturile tale", items: ["Dreptul de acces — poți solicita o copie a datelor tale", "Dreptul la rectificare — corectează datele inexacte", "Dreptul la ștergere", "Dreptul la restricționarea prelucrării", "Dreptul la portabilitatea datelor", "Dreptul de a depune o plângere la ANSPDCP"] },
      ].map((section) => (
        <div key={section.title} className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
          <ul className="space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle className="mt-0.5 size-4 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Contact DPO</h2>
        <p className="text-muted-foreground">Pentru orice întrebare privind datele tale: <a href="mailto:dpo@smarty.ro" className="text-primary hover:underline">dpo@smarty.ro</a></p>
      </div>
    </div>
  )
}

function CookieContent() {
  return (
    <div className="not-prose space-y-8">
      <p className="text-lg text-muted-foreground leading-relaxed">
        Acest site utilizează cookie-uri pentru a-ți oferi o experiență de navigare optimă.
      </p>
      {[
        { title: "Cookie-uri esențiale", desc: "Necesare pentru funcționarea site-ului: autentificare, securitate, coș de cumpărături. Nu pot fi dezactivate." },
        { title: "Cookie-uri de performanță", desc: "Ne ajută să înțelegem cum interacționezi cu site-ul (pagini vizitate, timp petrecut) pentru a optimiza experiența." },
        { title: "Cookie-uri de funcționalitate", desc: "Rețin preferințele tale pentru o experiență personalizată la vizitele următoare." },
        { title: "Cum le gestionezi", desc: "Poți șterge sau bloca cookie-urile din setările browserului tău." },
      ].map((s, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
          <p className="text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </div>
  )
}
