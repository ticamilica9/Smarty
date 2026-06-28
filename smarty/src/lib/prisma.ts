import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { createDemoPrismaClient } from './demo-prisma'

const globalForPrisma = globalThis as unknown as { prisma: any }

function createRealPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const realPrisma = globalForPrisma.prisma || createRealPrisma()
const demoPrisma = createDemoPrismaClient(realPrisma)

export const prisma = process.env.USE_DEMO_DATA === 'false' ? realPrisma : demoPrisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = realPrisma
