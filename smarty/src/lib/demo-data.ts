// In-memory demo data store — works without PostgreSQL
// Used as fallback when database is unavailable

export interface DemoUser {
  id: string; name: string; email: string; image: string | null;
  buyerRating: number; sellerRating: number; role: string;
  status: string; createdAt: Date;
}

export interface DemoProduct {
  id: string; sellerId: string; title: string; description: string;
  categoryId: string; condition: string; price: number; brand: string;
  shade: string; skinType: string; images: string[]; status: string;
  createdAt: Date; updatedAt: Date;
}

export interface DemoCategory {
  id: string; name: string; slug: string; parentId: string | null; icon: string | null;
  children?: DemoCategory[];
  _count?: { products: number };
}

export const demoCategories: DemoCategory[] = [
  { id: 'cat-1', name: 'Machiaj', slug: 'machiaj', parentId: null, icon: '🎨', _count: { products: 6 } },
  { id: 'cat-2', name: 'Buze', slug: 'buze', parentId: 'cat-1', icon: '💄', _count: { products: 2 } },
  { id: 'cat-3', name: 'Ochi', slug: 'ochi', parentId: 'cat-1', icon: '👁️', _count: { products: 1 } },
  { id: 'cat-4', name: 'Ten', slug: 'ten', parentId: 'cat-1', icon: '✨', _count: { products: 1 } },
  { id: 'cat-10', name: 'Îngrijire', slug: 'ingrijire', parentId: null, icon: '🧴', _count: { products: 4 } },
  { id: 'cat-11', name: 'Față', slug: 'fata', parentId: 'cat-10', icon: null, _count: { products: 2 } },
  { id: 'cat-12', name: 'Corp', slug: 'corp', parentId: 'cat-10', icon: null, _count: { products: 1 } },
  { id: 'cat-20', name: 'Haine', slug: 'haine', parentId: null, icon: '👗', _count: { products: 2 } },
  { id: 'cat-30', name: 'Parfumuri', slug: 'parfumuri', parentId: null, icon: '🌸', _count: { products: 1 } },
  { id: 'cat-40', name: 'Accesorii', slug: 'accesorii', parentId: null, icon: '💎', _count: { products: 1 } },
]

export const demoUsers: DemoUser[] = [
  { id: 'user-1', name: 'Ana Popescu', email: 'ana@email.com', image: null, buyerRating: 4.8, sellerRating: 4.9, role: 'USER' },
  { id: 'user-2', name: 'Maria Ionescu', email: 'maria@email.com', image: null, buyerRating: 4.5, sellerRating: 4.7, role: 'USER' },
  { id: 'user-3', name: 'Elena Vasile', email: 'elena@email.com', image: null, buyerRating: 4.2, sellerRating: 4.6, role: 'USER' },
]

export const demoProducts: DemoProduct[] = [
  {
    id: 'prod-1', sellerId: 'user-1', title: 'Ruj Maybelline SuperStay Matte Ink - Nuanța 100',
    description: 'Ruj lichid mat, rezistență până la 16 ore. Folosit o singură dată, nuanța nu mi se potrivește. Culoare intensă, nu transferă.',
    categoryId: 'cat-2', condition: 'LIKE_NEW', price: 35, brand: 'Maybelline',
    shade: '100', skinType: '', images: ['https://picsum.photos/seed/ruj1/600/600', 'https://picsum.photos/seed/ruj1b/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-20'), updatedAt: new Date('2026-06-20'),
  },
  {
    id: 'prod-2', sellerId: 'user-2', title: 'Fond de ten Estée Lauder Double Wear - 2N1',
    description: 'Fond de ten lichid, acoperire mare, finish natural. Culoarea 2N1 Desert Beige. Folosit ~20%, încă mai sunt ~25ml din 30ml.',
    categoryId: 'cat-4', condition: 'GOOD', price: 120, brand: 'Estée Lauder',
    shade: '2N1', skinType: 'Mixt', images: ['https://picsum.photos/seed/fdt1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-25'), updatedAt: new Date('2026-06-25'),
  },
  {
    id: 'prod-3', sellerId: 'user-1', title: 'Paletă de farduri Huda Beauty Rose Gold Remastered',
    description: 'Paletă iconică cu 18 nuanțe, de la mate la sclipitoare. Folosită doar 3 nuanțe, restul intacte. Oglindă inclusă.',
    categoryId: 'cat-3', condition: 'GOOD', price: 180, brand: 'Huda Beauty',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/paleta1/600/600', 'https://picsum.photos/seed/paleta1b/600/600', 'https://picsum.photos/seed/paleta1c/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-26'), updatedAt: new Date('2026-06-26'),
  },
  {
    id: 'prod-4', sellerId: 'user-3', title: 'Gloss Dior Addict Lip Maximizer - 001 Pink',
    description: 'Gloss de buze cu efect de volum. Nuanța 001 Pink, cea mai căutată. Nou, sigilat, primit cadou dar am deja unul.',
    categoryId: 'cat-2', condition: 'NEW', price: 150, brand: 'Dior',
    shade: '001', skinType: '', images: ['https://picsum.photos/seed/gloss1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-27'), updatedAt: new Date('2026-06-27'),
  },
  {
    id: 'prod-5', sellerId: 'user-2', title: 'Serum The Ordinary Niacinamide 10% + Zinc 1%',
    description: 'Serum pentru ten gras și mixt. Reglează sebumul, reduce porii. Folosit ~30%, mai sunt ~20ml din 30ml.',
    categoryId: 'cat-11', condition: 'GOOD', price: 40, brand: 'The Ordinary',
    shade: '', skinType: 'Gras', images: ['https://picsum.photos/seed/serum1/600/600', 'https://picsum.photos/seed/serum1b/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-22'), updatedAt: new Date('2026-06-22'),
  },
  {
    id: 'prod-6', sellerId: 'user-1', title: 'Cremă hidratantă CeraVe Facial Moisturising Lotion',
    description: 'Cremă de față cu acid hialuronic și ceramide. Pentru ten normal spre uscat. Folosită 2-3 ori, cutia completă 52ml.',
    categoryId: 'cat-11', condition: 'LIKE_NEW', price: 50, brand: 'CeraVe',
    shade: '', skinType: 'Uscat', images: ['https://picsum.photos/seed/crema1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-24'), updatedAt: new Date('2026-06-24'),
  },
  {
    id: 'prod-7', sellerId: 'user-3', title: 'Rochie de vară Zara - Mărimea M',
    description: 'Rochie florală midi, material fin, perfectă pentru vară. Purtată o singură dată la o nuntă. Culoare: albastru cu flori albe.',
    categoryId: 'cat-20', condition: 'LIKE_NEW', price: 85, brand: 'Zara',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/rochie1/600/600', 'https://picsum.photos/seed/rochie1b/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-26'), updatedAt: new Date('2026-06-26'),
  },
  {
    id: 'prod-8', sellerId: 'user-2', title: 'Geantă crossbody Guess - Roz pal',
    description: 'Geantă Guess mini, piele ecologică, culoare roz pal. Perfectă pentru ocazii. Folosită de 2 ori, ca nouă.',
    categoryId: 'cat-40', condition: 'LIKE_NEW', price: 200, brand: 'Guess',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/geanta1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-23'), updatedAt: new Date('2026-06-23'),
  },
  {
    id: 'prod-9', sellerId: 'user-1', title: 'Bluză office Reserved - Mărimea S',
    description: 'Bluză albă elegantă, material satinat, perfectă pentru birou. Purtată de câteva ori, impecabilă.',
    categoryId: 'cat-20', condition: 'GOOD', price: 45, brand: 'Reserved',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/bluza1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-21'), updatedAt: new Date('2026-06-21'),
  },
  {
    id: 'prod-10', sellerId: 'user-3', title: 'Parfum YSL Black Opium - 50ml',
    description: 'Parfum Yves Saint Laurent Black Opium, 50ml, apa de parfum. Folosit ~15%, mirosul nu mi se mai potrivește. Cutie originală.',
    categoryId: 'cat-30', condition: 'GOOD', price: 280, brand: 'Yves Saint Laurent',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/parfum1/600/600', 'https://picsum.photos/seed/parfum1b/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-19'), updatedAt: new Date('2026-06-19'),
  },
  {
    id: 'prod-11', sellerId: 'user-2', title: 'Scrub de corp Coconut Coffee Scrub',
    description: 'Scrub natural cu cafea și ulei de cocos. Exfoliază și hidratează. Nou, sigilat, 200g. Am cumpărat 2 din greșeală.',
    categoryId: 'cat-12', condition: 'NEW', price: 30, brand: 'The Body Shop',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/scrub1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-28'), updatedAt: new Date('2026-06-28'),
  },
  {
    id: 'prod-12', sellerId: 'user-1', title: 'Set perii machiaj Real Techniques - 5 bucăți',
    description: 'Set de 5 perii profesionale: fond de ten, pudră, blush, blending (x2). Folosite 2-3 ori, spălate și dezinfectate.',
    categoryId: 'cat-1', condition: 'GOOD', price: 90, brand: 'Real Techniques',
    shade: '', skinType: '', images: ['https://picsum.photos/seed/perii1/600/600'],
    status: 'ACTIVE', createdAt: new Date('2026-06-18'), updatedAt: new Date('2026-06-18'),
  },
]

export const demoRFQs = [
  { id: 'rfq-1', buyerId: 'user-2', title: 'Caut ruj Maybelline nuanta 100', description: 'Vreau ruj Maybelline SuperStay Matte Ink, nuanta 100. Preferabil nou sau putin folosit. Buget maxim 40 RON.', categoryId: 'cat-2', maxBudget: 40, expiresAt: new Date('2026-07-05'), status: 'OPEN', createdAt: new Date('2026-06-28'), buyer: demoUsers[1], category: demoCategories[1], _count: { offers: 2 }, offers: [] },
  { id: 'rfq-2', buyerId: 'user-3', title: 'Fond de ten Dior Forever Skin Glow', description: 'Caut fond de ten Dior Forever Skin Glow, nuanta 2N. Preferabil peste 70% plin.', categoryId: 'cat-4', maxBudget: 150, expiresAt: new Date('2026-07-10'), status: 'OPEN', createdAt: new Date('2026-06-27'), buyer: demoUsers[2], category: demoCategories[3], _count: { offers: 1 }, offers: [] },
  { id: 'rfq-3', buyerId: 'user-1', title: 'Paleta farduri Anastasia Beverly Hills', description: 'Caut paleta Anastasia Beverly Hills Modern Renaissance sau Soft Glam. Stare buna sau foarte buna.', categoryId: 'cat-3', maxBudget: 160, expiresAt: new Date('2026-07-08'), status: 'OPEN', createdAt: new Date('2026-06-26'), buyer: demoUsers[0], category: demoCategories[2], _count: { offers: 0 }, offers: [] },
  { id: 'rfq-4', buyerId: 'user-2', title: 'Rochie de ocazie marimea M', description: 'Caut rochie eleganta pentru un eveniment. Marimea M. Culori: burgundy, navy sau negru. Buget maxim 150 RON.', categoryId: 'cat-20', maxBudget: 150, expiresAt: new Date('2026-07-12'), status: 'OPEN', createdAt: new Date('2026-06-28'), buyer: demoUsers[1], category: demoCategories[7], _count: { offers: 0 }, offers: [] },
]

export function getDemoProductById(id: string) {
  const product = demoProducts.find(p => p.id === id)
  if (!product) return null
  const seller = demoUsers.find(u => u.id === product.sellerId)
  const category = findCategory(product.categoryId)
  return { ...product, seller: { id: seller?.id, name: seller?.name, image: seller?.image, sellerRating: seller?.sellerRating, _count: { products: demoProducts.filter(p => p.sellerId === seller?.id && p.status === 'ACTIVE').length, sellerOrders: 0 } }, category, variants: [] }
}

function findCategory(id: string): any {
  for (const cat of demoCategories) {
    if (cat.id === id) return cat
    if (cat.children) {
      for (const child of cat.children) {
        if (child.id === id) return child
      }
    }
  }
  return demoCategories[0]
}
