# Smarty Marketplace — Specificație de Design

**Data:** 2026-06-28
**Tip proiect:** Marketplace C2C cosmetice, îmbrăcăminte și accesorii
**Stack:** Next.js 15 + tRPC + Prisma + PostgreSQL + Stripe Connect + Sameday EasyBox
**Termen MVP:** 2-4 săptămâni

---

## 1. Viziune

Smarty este un marketplace C2C unde utilizatorii pot cumpăra și vinde cosmetice, haine și accesorii. Platforma se diferențiază prin trei mecanisme de cumpărare: negociere directă (gen Vinted), cereri și oferte (RFQ — gen piese auto), și cumpărare directă. Plățile sunt gestionate prin Stripe Connect cu model escrow: banii sunt reținuți până la confirmarea primirii de către cumpărător.

---

## 2. Fluxuri Principale

### 2.1 Cumpărare Directă
```
Navigare → Produs → Adaugă în coș → Checkout → Plată → Escrow → Livrare EasyBox → Confirmare → Vânzătorul primește banii
```

### 2.2 Negociere pe Produs (gen Vinted)
```
Vânzător listează produs (preț afișat)
  → Cumpărător face o ofertă (sumă mai mică)
    → Vânzător: acceptă / refuză / contraofertează
      → Dacă contraofertă: cumpărătorul poate accepta, refuza sau contraoferta la rândul lui
        (maxim 3 runde de contraofertă per negociere)
      → Dacă acceptat: Order creat → Plată → Escrow → Livrare → Confirmare
```

### 2.3 Cereri și Oferte — RFQ (gen piese auto)
```
Cumpărător postează cerere ("Vreau ruj Maybelline nuanța 100, buget 50 RON")
  → Vânzătorii văd cererile active și trimit oferte
    → Cumpărătorul primește notificări, alege oferta câștigătoare
      → Order creat → Plată → Escrow → Livrare → Confirmare
```

### 2.4 Retur
```
Cumpărător cere retur (max 14 zile) cu motiv + poze
  → Vânzătorul: acceptă / refuză
    → Dacă acceptat: cumpărător trimite prin EasyBox
      → Vânzător confirmă primirea → banii revin cumpărătorului din escrow
```

---

## 3. Modelul de Date

### Entități

#### Utilizatori
| Entitate | Câmpuri | Descriere |
|---|---|---|
| `User` | id, email, name, avatar, buyerRating, sellerRating, stripeConnectId, createdAt | Utilizator dual (poate fi și cumpărător, și vânzător) |
| `UserAddress` | id, userId, label, city, address, postalCode, phone, isDefault | Adrese de livrare |
| `SellerProfile` | id, userId, storeName, description, returnPolicy, createdAt | Profil public de vânzător |

#### Produse
| Entitate | Câmpuri | Descriere |
|---|---|---|
| `Product` | id, sellerId, title, description, categoryId, condition (NEW/LIKE_NEW/GOOD/FAIR), price, brand, shade, skinType, images[], status (ACTIVE/SOLD/HIDDEN), createdAt | Produs listat de vânzător |
| `ProductCategory` | id, name, parentId, slug, icon | Categorii ierarhice (Makeup → Buze → Ruj) |
| `ProductVariant` | id, productId, attribute, value (ex: Mărime S/M/L) | Variante (relevant pentru haine) |

#### Negociere + RFQ
| Entitate | Câmpuri | Descriere |
|---|---|---|
| `Offer` | id, productId, buyerId, sellerId, amount, status (PENDING/ACCEPTED/REFUSED/COUNTERED), expiresAt, createdAt | Ofertă de negociere pe un produs |
| `RFQ` | id, buyerId, title, description, categoryId, maxBudget, expiresAt, status (OPEN/CLOSED/AWARDED) | Cerere de oferte postată de cumpărător |
| `RFQOffer` | id, rfqId, sellerId, productId?, amount, message, status (PENDING/ACCEPTED/REFUSED) | Ofertă a unui vânzător la o cerere RFQ |

#### Comenzi + Plăți
| Entitate | Câmpuri | Descriere |
|---|---|---|
| `Order` | id, buyerId, sellerId, productId, offerId?, rfqOfferId?, amount, status (CREATED/PAID/SHIPPED/DELIVERED/RETURNED/DISPUTED), createdAt | Comanda propriu-zisă |
| `Payment` | id, orderId, stripePaymentIntentId, stripeTransferId, amount, status (HELD/RELEASED/REFUNDED), escrowReleasedAt | Plata prin Stripe Connect escrow |
| `Shipment` | id, orderId, easyboxAWB, trackingUrl, pickupCode, status, estimatedDelivery | Livrare prin Sameday EasyBox |

#### Retururi + Recenzii
| Entitate | Câmpuri | Descriere |
|---|---|---|
| `Return` | id, orderId, buyerId, reason, images[], status (REQUESTED/ACCEPTED/REFUSED/SHIPPED_BACK/REFUNDED) | Cerere de retur |
| `Review` | id, orderId, reviewerId, targetId, rating (1-5), text, images[] | Recenzie după tranzacție |

---

## 4. Arhitectură Tehnică

### Stack
| Strat | Tehnologie | Justificare |
|---|---|---|
| Framework | Next.js 15 App Router | RSC, streaming, SEO, ISR, o bază de cod |
| API | tRPC + Server Actions | Type safety end-to-end, rapid, validare Zod |
| Auth | NextAuth.js v5 | Email + OAuth (Google, Facebook) |
| DB | PostgreSQL + Prisma | Relațional cu tranzacții, type-safe, migrații |
| Plăți + Escrow | Stripe Connect | Escrow nativ, suport RON, marketplace-ready |
| Livrare | Sameday API | EasyBox lockere, tracking, AWB automat |
| UI | Tailwind CSS + shadcn/ui | Rapid, accesibil, personalizabil |
| Stocare fișiere | MinIO (S3-compatibil, self-hosted) | Fără costuri externe la MVP |
| Timp real | Redis pub/sub + SSE | Notificări live: oferte, status comenzi |
| Cache | Redis | Sesiuni, rate limiting, cozi |
| Hosting | VPS + Docker Compose | PostgreSQL + Redis + MinIO + Next.js, cost fix |

### Structura Proiectului
```
smarty/
├── src/
│   ├── app/
│   │   ├── (public)/           # Layout public — header, footer
│   │   │   ├── page.tsx                    # Home: hero, categorii, RFQ recente
│   │   │   ├── produse/[id]/page.tsx       # Detaliu + galerie + "ofertează"
│   │   │   ├── categorii/[slug]/page.tsx   # Browse cu filtre și sortare
│   │   │   ├── cereri/                     # RFQ — listă
│   │   │   ├── cereri/[id]/page.tsx        # RFQ — detaliu + oferte primite
│   │   │   ├── cereri/noua/page.tsx        # Postează cerere nouă
│   │   │   ├── cautare/page.tsx            # Căutare globală
│   │   │   └── blog/                       # Blog + ghiduri (MDX)
│   │   ├── (auth)/              # Login / Înregistrare
│   │   ├── (cont)/              # Layout cont (necesită auth)
│   │   │   ├── comenzi/page.tsx
│   │   │   ├── comenzi/[id]/page.tsx
│   │   │   ├── oferte/page.tsx             # Oferte făcute + primite
│   │   │   ├── cereri/page.tsx             # Cererile mele RFQ
│   │   │   ├── produse/page.tsx            # Produsele mele de vânzare
│   │   │   ├── produse/nou/page.tsx
│   │   │   ├── produse/[id]/edit/page.tsx
│   │   │   ├── wishlist/page.tsx
│   │   │   ├── wallet/page.tsx             # Portofel Stripe Connect
│   │   │   ├── retururi/page.tsx
│   │   │   └── setari/page.tsx
│   │   └── admin/                # Admin panel (rol admin)
│   │       ├── comenzi/page.tsx
│   │       ├── dispute/page.tsx
│   │       └── utilizatori/page.tsx
│   ├── server/
│   │   ├── api/routers/          # tRPC routers
│   │   │   ├── product.ts
│   │   │   ├── offer.ts
│   │   │   ├── rfq.ts
│   │   │   ├── order.ts
│   │   │   ├── payment.ts
│   │   │   ├── shipping.ts
│   │   │   ├── review.ts
│   │   │   └── user.ts
│   │   ├── stripe.ts             # Stripe Connect helpers
│   │   └── sameday.ts            # Sameday API client
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── sse.ts                # Server-Sent Events
│   │   └── utils.ts
│   └── components/               # shadcn/ui + componente custom
├── prisma/
│   └── schema.prisma
├── content/                      # Blog MDX
├── public/
├── docker-compose.yml            # PostgreSQL, Redis, MinIO
├── Dockerfile
└── docs/
```

---

## 5. Pagini și Componente

### 5.1 Home (`/`)
- Hero carousel cu categorii populare și RFQ-uri recente
- Grid categorii principale: Makeup, Îngrijire, Haine, Accesorii
- Secțiune "Cele mai recente cereri" — RFQ-uri active
- Secțiune "Produse recomandate" — cele mai populare
- Articole recente din blog

### 5.2 Pagină Produs (`/produse/[id]`)
- Galerie de imagini (carousel + thumbnail-uri)
- Titlu, preț, stare (nou/ca nou/bun/satisfăcător)
- Descriere, brand, nuanță, tip ten (dacă aplicabil)
- Profil vânzător (rating, număr vânzări)
- Buton "Ofertează" — input sumă + trimite ofertă
- Buton "Cumpără acum" — prețul listat
- Secțiune recenzii

### 5.3 Cereri RFQ (`/cereri`)
- Listă cereri active filtrate pe categorii
- Fiecare: titlu, buget maxim, număr oferte, timp rămas
- Buton "Postează o cerere"

### 5.4 Detaliu Cerere (`/cereri/[id]`)
- Titlu, descriere, buget maxim
- Ofertele primite (listă cu sumă, vânzător, mesaj)
- Buton "Acceptă oferta" pentru autorul cererii

### 5.5 Coș + Checkout (`/cos`, `/checkout`)
- Coș: produse, cantități, subtotal
- Checkout: adresă, selecție EasyBox, review, plată

### 5.6 Cont
- **Comenzi:** Istoric, status live (plătită/expediată/livrată)
- **Oferte:** Făcute (ca buyer) și primite (ca seller)
- **Produsele mele:** Produse listate, active/vândute/ascunse
- **Wallet:** Onboarding Stripe Connect, istoric încasări
- **Wishlist:** Produse salvate
- **Retururi:** Cereri active și istoric

---

## 6. Fluxuri Tehnice

### 6.1 Flux Negociere
1. `POST /api/trpc/offer.create` — buyer trimite ofertă
2. SSE event către seller — notificare în timp real
3. Seller: `POST /api/trpc/offer.respond` — accept/refuse/counter
4. Dacă status = ACCEPTED:
   - Se creează `Order`
   - `POST /api/trpc/payment.createIntent` — Stripe PaymentIntent
   - Buyer plătește → fonduri blocate în Stripe Connect escrow
   - SSE: seller notificat să expedieze

### 6.2 Flux RFQ
1. `POST /api/trpc/rfq.create` — buyer postează cerere
2. Sellerii văd cererea în `/cereri` și pe profilul lor
3. `POST /api/trpc/rfq.offer` — seller trimite ofertă
4. SSE către buyer — notificare ofertă nouă
5. `POST /api/trpc/rfq.accept` — buyer alege oferta
6. Se creează `Order` → flux normal de plată și livrare

### 6.3 Flux Livrare EasyBox
1. Seller: introduce coletul la orice locker EasyBox
2. Sameday API: generează AWB și cod de ridicare
3. Buyer: primește cod SMS/email → ridică din locker
4. Webhook Sameday: status livrat → SSE notificare

### 6.4 Flux Escrow
1. Plata are status `HELD` după checkout
2. Buyer confirmă primirea → `POST /api/trpc/order.confirm`
3. `stripe.transfers.create` — banii se transferă către seller
4. Payment status → `RELEASED`
5. Dacă buyer nu confirmă în 72h de la livrare: auto-release
6. Dacă buyer cere retur și e acceptat: `REFUNDED`

### 6.5 Flux Retur
1. `POST /api/trpc/return.request` — buyer cere retur (motiv + poze, max 14 zile de la livrare)
2. SSE notificare seller
3. Seller: `POST /api/trpc/return.respond` — accept/refuse (cu motiv dacă refuză)
4. Dacă acceptat: buyer primește instrucțiuni EasyBox retur
5. Seller confirmă primirea retur → refund Stripe → banii revin buyer
6. Dacă refuzat: buyer poate escalada în dispută → admin intervine manual

### 6.6 Dispute (Admin)
1. Buyer sau seller escaladează o comandă în dispută
2. Admin-ul vede disputa în `/admin/dispute` cu istoricul complet (comandă, plată, livrare, mesaje)
3. Admin-ul poate: forța returul, forța release-ul banilor, sau media
4. Decizia admin-ului e finală și execută automat acțiunea Stripe corespunzătoare

---

## 7. Categorii Inițiale

```
Toate Categoriile
├── Makeup
│   ├── Buze (ruj, gloss, liner, balm)
│   ├── Ochi (palete, tus, mascara, creion)
│   ├── Ten (fond de ten, corector, pudră, primer)
│   └── Sprâncene (pomadă, creion, gel)
├── Îngrijire
│   ├── Față (cremă, ser, toner, mască)
│   ├── Corp (loțiune, scrub, ulei)
│   └── Păr (șampon, mască, tratament)
├── Haine
│   ├── Dama
│   ├── Barbati
│   └── Copii
├── Accesorii
│   ├── Genți
│   ├── Bijuterii
│   └── Ochelari
└── Altele
```

---

## 8. Design Decisions

| Decizie | Alegere | Motiv |
|---|---|---|
| Stripe Connect vs Netopia | Stripe Connect | Escrow nativ, marketplace API, documentație excelentă, onboarding selleri |
| tRPC vs REST | tRPC | Type safety end-to-end, rapid de iterat, validare Zod integrată |
| EasyBox doar vs curieri multipli | Doar EasyBox la MVP | Simplifică logistica imens; e suficient pentru cosmetice/haine mici; poți adăuga alți curieri ulterior |
| Self-hosted MinIO vs Cloudinary | MinIO | Zero costuri externe, control total, suficient pentru MVP |
| SSE vs WebSockets | SSE | Mai simplu, suficient pentru notificări unidirecționale |
| Fără chat la MVP | Amânat | Ar adăuga ~2 săptămâni; negocierea prin oferte e suficientă la lansare |

---

## 9. Ce NU intră în MVP

- **Chat în timp real** — negocierea prin oferte e suficientă la lansare
- **Aplicație mobilă nativă** — site-ul e responsive; PWA se poate adăuga ușor
- **Program loialitate** — va veni post-MVP
- **Curieri multipli** — doar EasyBox la lansare; FAN/Cargus ulterior
- **Sistem cupoane** — amânat
- **Verificare identitate vânzători** — trust prin Stripe Connect onboarding
- **Dashboard analytics vânzători** — doar listare produse și comenzi simplu

---

## 10. Considerații non-funcționale

- **SEO:** Fiecare pagină de produs și categorie generează metadate dinamice; sitemap.xml automat; ISR pentru pagini publice
- **Performanță:** Imagini optimizate cu Next.js Image; RSC streaming pentru pagini cu multe produse; Redis cache pe query-uri frecvente
- **Securitate:** tRPC cu autentificare per procedură; validare Zod pe toate input-urile; Stripe gestionează datele de card (no PCI scope); rate limiting pe API
- **Responsive:** Mobile-first — majoritatea utilizatorilor vor fi pe telefon; shadcn/ui oferă componente accesibile din start
