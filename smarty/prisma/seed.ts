import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding categories...')

  // ── Top-level categories ──
  const makeup = await prisma.productCategory.create({
    data: {
      name: 'Machiaj',
      slug: 'machiaj',
      icon: '💄',
    },
  })

  const skincare = await prisma.productCategory.create({
    data: {
      name: 'Ingrijirea tenului',
      slug: 'ingrijirea-tenului',
      icon: '🧴',
    },
  })

  const bodycare = await prisma.productCategory.create({
    data: {
      name: 'Ingrijirea corpului',
      slug: 'ingrijirea-corpului',
      icon: '🧖',
    },
  })

  const hair = await prisma.productCategory.create({
    data: {
      name: 'Par',
      slug: 'par',
      icon: '💇',
    },
  })

  const fragrances = await prisma.productCategory.create({
    data: {
      name: 'Parfumuri',
      slug: 'parfumuri',
      icon: '🧪',
    },
  })

  const clothing = await prisma.productCategory.create({
    data: {
      name: 'Haine',
      slug: 'haine',
      icon: '👗',
    },
  })

  const accessories = await prisma.productCategory.create({
    data: {
      name: 'Accesorii',
      slug: 'accesorii',
      icon: '👜',
    },
  })

  // ── Machiaj ──
  const fata = await prisma.productCategory.create({
    data: { name: 'Fata', slug: 'fata', parentId: makeup.id },
  })
  const ochi = await prisma.productCategory.create({
    data: { name: 'Ochi', slug: 'ochi', parentId: makeup.id },
  })
  const buze = await prisma.productCategory.create({
    data: { name: 'Buze', slug: 'buze', parentId: makeup.id },
  })
  const unghii = await prisma.productCategory.create({
    data: { name: 'Unghii', slug: 'unghii', parentId: makeup.id },
  })

  // Machiaj > Fata
  await prisma.productCategory.createMany({
    data: [
      { name: 'Fond de ten', slug: 'fond-de-ten', parentId: fata.id },
      { name: 'Corector', slug: 'corector', parentId: fata.id },
      { name: 'BB Cream', slug: 'bb-cream', parentId: fata.id },
      { name: 'Pudra', slug: 'pudra', parentId: fata.id },
      { name: 'Blush', slug: 'blush', parentId: fata.id },
      { name: 'Iluminator', slug: 'iluminator', parentId: fata.id },
      { name: 'Bronzer', slug: 'bronzer', parentId: fata.id },
      { name: 'Contur', slug: 'contur', parentId: fata.id },
    ],
  })

  // Machiaj > Ochi
  await prisma.productCategory.createMany({
    data: [
      { name: 'Fard de ochi', slug: 'fard-de-ochi', parentId: ochi.id },
      { name: 'Eyeliner', slug: 'eyeliner', parentId: ochi.id },
      { name: 'Mascara', slug: 'mascara', parentId: ochi.id },
      { name: 'Creion sprancene', slug: 'creion-sprancene', parentId: ochi.id },
      { name: 'Gene false', slug: 'gene-false', parentId: ochi.id },
    ],
  })

  // Machiaj > Buze
  await prisma.productCategory.createMany({
    data: [
      { name: 'Ruj', slug: 'ruj', parentId: buze.id },
      { name: 'Gloss', slug: 'gloss', parentId: buze.id },
      { name: 'Creion buze', slug: 'creion-buze', parentId: buze.id },
      { name: 'Balsam buze', slug: 'balsam-buze', parentId: buze.id },
    ],
  })

  // Machiaj > Unghii
  await prisma.productCategory.createMany({
    data: [
      { name: 'Oja', slug: 'oja', parentId: unghii.id },
      { name: 'Tratamente unghii', slug: 'tratamente-unghii', parentId: unghii.id },
      { name: 'Accesorii unghii', slug: 'accesorii-unghii', parentId: unghii.id },
    ],
  })

  // ── Ingrijirea tenului ──
  await prisma.productCategory.createMany({
    data: [
      { name: 'Demachiante', slug: 'demachiante', parentId: skincare.id },
      { name: 'Creme', slug: 'creme', parentId: skincare.id },
      { name: 'Seruri', slug: 'seruri', parentId: skincare.id },
      { name: 'Masti', slug: 'masti', parentId: skincare.id },
      { name: 'Tonere', slug: 'tonere', parentId: skincare.id },
      { name: 'SPF', slug: 'spf', parentId: skincare.id },
    ],
  })

  // ── Ingrijirea corpului ──
  await prisma.productCategory.createMany({
    data: [
      { name: 'Lotiuni', slug: 'lotiuni', parentId: bodycare.id },
      { name: 'Uleiuri', slug: 'uleiuri', parentId: bodycare.id },
      { name: 'Deodorante', slug: 'deodorante', parentId: bodycare.id },
      { name: 'Ingrijire maini', slug: 'ingrijire-maini', parentId: bodycare.id },
      { name: 'Ingrijire picioare', slug: 'ingrijire-picioare', parentId: bodycare.id },
    ],
  })

  // ── Par ──
  await prisma.productCategory.createMany({
    data: [
      { name: 'Sampoane', slug: 'sampoane', parentId: hair.id },
      { name: 'Balsamuri', slug: 'balsamuri', parentId: hair.id },
      { name: 'Tratamente par', slug: 'tratamente-par', parentId: hair.id },
      { name: 'Stilizare', slug: 'stilizare', parentId: hair.id },
    ],
  })

  // ── Parfumuri ──
  await prisma.productCategory.createMany({
    data: [
      { name: 'Parfumuri femei', slug: 'parfumuri-femei', parentId: fragrances.id },
      { name: 'Parfumuri barbati', slug: 'parfumuri-barbati', parentId: fragrances.id },
      { name: 'Parfumuri unisex', slug: 'parfumuri-unisex', parentId: fragrances.id },
    ],
  })

  // ── Haine ──
  const femei = await prisma.productCategory.create({
    data: { name: 'Femei', slug: 'femei', parentId: clothing.id },
  })
  const barbati = await prisma.productCategory.create({
    data: { name: 'Barbati', slug: 'barbati', parentId: clothing.id },
  })

  // Haine > Femei
  await prisma.productCategory.createMany({
    data: [
      { name: 'Rochii', slug: 'rochii', parentId: femei.id },
      { name: 'Topuri', slug: 'topuri', parentId: femei.id },
      { name: 'Bluze', slug: 'bluze', parentId: femei.id },
      { name: 'Pantaloni', slug: 'pantaloni-femei', parentId: femei.id },
      { name: 'Fuste', slug: 'fuste', parentId: femei.id },
      { name: 'Geci si jachete', slug: 'geci-si-jachete-femei', parentId: femei.id },
      { name: 'Rochie de seara', slug: 'rochie-de-seara', parentId: femei.id },
      { name: 'Lenjerie', slug: 'lenjerie', parentId: femei.id },
    ],
  })

  // Haine > Barbati
  await prisma.productCategory.createMany({
    data: [
      { name: 'Camasi', slug: 'camasi', parentId: barbati.id },
      { name: 'Tricouri', slug: 'tricouri', parentId: barbati.id },
      { name: 'Pantaloni barbati', slug: 'pantaloni-barbati', parentId: barbati.id },
      { name: 'Geci si jachete barbati', slug: 'geci-si-jachete-barbati', parentId: barbati.id },
      { name: 'Costume', slug: 'costume', parentId: barbati.id },
    ],
  })

  // ── Accesorii ──
  await prisma.productCategory.createMany({
    data: [
      { name: 'Bijuterii', slug: 'bijuterii', parentId: accessories.id },
      { name: 'Ceasuri', slug: 'ceasuri', parentId: accessories.id },
      { name: 'Esarfe', slug: 'esarfe', parentId: accessories.id },
      { name: 'Curele', slug: 'curele', parentId: accessories.id },
      { name: 'Ochelari', slug: 'ochelari', parentId: accessories.id },
      { name: 'Genti si posete', slug: 'genti-si-posete', parentId: accessories.id },
    ],
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
