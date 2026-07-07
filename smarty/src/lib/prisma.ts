import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { createDemoPrismaClient } from './demo-prisma'
import { isPreviewMode } from './preview-mode'

const globalForPrisma = globalThis as unknown as { prisma: any }

function createRealPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const realPrisma = globalForPrisma.prisma || createRealPrisma()
const demoPrisma = createDemoPrismaClient(realPrisma)

// In preview mode, always use demo data (in-memory, no DB required).
// Otherwise, respect USE_DEMO_DATA env var (defaults to demo when absent).
const useDemoData = isPreviewMode() || process.env.USE_DEMO_DATA !== 'false'

export const prisma = useDemoData ? demoPrisma : realPrisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = realPrisma
