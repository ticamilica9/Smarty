# Smarty — Funcționalitate "Accept schimb"

**Data:** 2026-07-15
**Status:** Aprobat
**Tip:** Feature

## Sumar

Adăugare funcționalitate de schimb/trade la anunțurile din Smarty. Vânzătorii pot marca produsele ca "Accept schimb", opțional pot specifica ce îi interesează la schimb și dacă acceptă diferență de bani. Cumpărătorii pot propune un schimb printr-un formular dedicat. Produsele care acceptă schimb sunt evidențiate cu badge pe card și pot fi filtrate în căutare.

## Modelul de date

### Product — câmpuri noi

| Câmp | Tip | Default | Descriere |
|---|---|---|---|
| `acceptTrade` | Boolean | false | Acceptă schimb? |
| `tradeInterests` | String? (Text) | null | Ce interesează la schimb — text liber, opțional |
| `acceptMoneyDifference` | Boolean | false | Acceptă diferență de bani la schimb? |

### Offer — câmpuri noi

| Câmp | Tip | Default | Descriere |
|---|---|---|---|
| `type` | String | "MONEY" | Tip ofertă: "MONEY" sau "TRADE" |
| `tradeDescription` | String? (Text) | null | Ce oferă cumpărătorul la schimb |
| `moneyDifference` | Float? | null | Diferența de bani propusă (pozitiv = cumpărătorul plătește extra) |

## API (tRPC Router)

### `product.create` — input extins
- `acceptTrade: z.boolean().default(false)`
- `tradeInterests: z.string().optional()`
- `acceptMoneyDifference: z.boolean().default(false)`

### `product.update` — input extins
- Aceleași 3 câmpuri, toate opționale

### `product.search` — input extins
- `acceptTrade: z.boolean().optional()` — filtru în căutare

### `offer.create` — input extins
- `type: z.enum(['MONEY', 'TRADE']).default('MONEY')`
- `tradeDescription: z.string().optional()` — obligatoriu când type='TRADE' (validat server-side)
- `moneyDifference: z.number().optional()`

## Frontend

### Formular produs (`product-form.tsx`)
După preț, secțiune nouă "Schimb":
- Radio: Accept schimb / Nu accept schimb (default: Nu)
- Dacă "Accept": textarea "Ce mă interesează la schimb?" (opțional)
- Dacă "Accept": radio "Pot oferi diferența de bani?" Da / Nu (default: Nu)

### Card produs (`product-card.tsx`)
- Badge "🔄 Schimb" lângă badge-ul de stare, doar dacă `acceptTrade === true`
- Culoare distinctă (verde deschis)

### Pagină detaliu produs (`produse/[id]/page.tsx`)
Dacă `acceptTrade === true`, secțiune între descriere și seller info:
- Text "Vânzătorul acceptă schimb"
- Dacă există `tradeInterests`: textul afișat
- Badge "Acceptă diferență de bani" sau "Nu acceptă diferență de bani"
- Buton "Propune un schimb" → dialog cu:
  - Textarea "Ce oferi la schimb?" (obligatoriu)
  - Input "Diferența de bani (RON)" (doar dacă acceptMoneyDifference)
  - Submit → `offer.create({ type: 'TRADE', ... })`

### Filtru căutare (`product-filters.tsx`)
- Checkbox "Doar produse care acceptă schimb"
- Parametru URL: `?acceptTrade=true`

### Date existente — actualizare pentru testare
- 3-5 produse din seed/demo data vor fi actualizate cu `acceptTrade: true` și valori realiste pentru `tradeInterests` și `acceptMoneyDifference`

## Migrare DB
- Migrare Prisma pentru cele 3 câmpuri noi pe Product
- Migrare Prisma pentru cele 3 câmpuri noi pe Offer (type, tradeDescription, moneyDifference)
- Valorile default asigură compatibilitatea inversă

## Deploy
- Push la git
- SSH pe VPS (72.62.30.193)
- `git pull` în `/opt/smarty`
- `npx prisma migrate deploy`
- `pm2 restart smarty`
