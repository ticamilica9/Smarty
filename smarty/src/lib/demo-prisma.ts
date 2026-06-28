// Demo data wrapper — falls back to in-memory data when DB is unavailable
import { demoCategories, demoProducts, demoUsers, demoOrders, demoRFQs, getDemoProductById, getDemoUserById } from './demo-data'

const USE_DEMO = true // Set to false once PostgreSQL is working

function timeout<T>(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
}

async function withFallback<T>(dbCall: Promise<T>, fallback: T, timeoutMs = 3000): Promise<T> {
  if (USE_DEMO) return fallback
  try {
    return await Promise.race([dbCall, timeout(timeoutMs)])
  } catch {
    return fallback
  }
}

// Create a proxy that wraps the real prisma client
export function createDemoPrismaClient(realPrisma: any) {
  return new Proxy(realPrisma, {
    get(target, model: string) {
      if (model === '$transaction') {
        return (...args: any[]) => {
          if (USE_DEMO) {
            // Support array of promises
            if (Array.isArray(args[0])) {
              return Promise.all(args[0])
            }
            // Support callback function
            if (typeof args[0] === 'function') {
              return args[0](target)
            }
            return Promise.resolve()
          }
          return (target as any).$transaction(...args)
        }
      }

      if (model === '$connect' || model === '$disconnect') {
        return (...args: any[]) => {
          if (USE_DEMO) return Promise.resolve()
          return (target as any)[model](...args)
        }
      }

      const modelHandlers: Record<string, Record<string, Function>> = {
        productCategory: {
          findMany: async (args: any) => {
            const { parentId } = args?.where || {}
            let cats = demoCategories
            if (parentId !== undefined) {
              cats = demoCategories.filter(c => c.parentId === parentId)
            }
            return cats.map(c => ({
              ...c,
              children: demoCategories.filter(sub => sub.parentId === c.id),
            }))
          },
          findUnique: async (args: any) => {
            const { slug, id } = args?.where || {}
            const cat = demoCategories.find(c => c.slug === slug || c.id === id)
            if (!cat) return null
            const parent = cat.parentId ? demoCategories.find(c => c.id === cat.parentId) : null
            const children = demoCategories.filter(c => c.parentId === cat.id)
            return { ...cat, parent, children: children.map(c => ({ ...c, _count: { products: c._count?.products || 0 } })), _count: { products: cat._count?.products || 0, children: children.length } }
          },
        },
        product: {
          findMany: async (args: any) => {
            let products = [...demoProducts]
            // Only filter by ACTIVE when no status filter is provided (public queries)
            if (!args?.where?.status) {
              products = products.filter(p => p.status === 'ACTIVE')
            } else if (args.where.status) {
              products = products.filter(p => p.status === args.where.status)
            }
            if (args?.where?.categoryId) products = products.filter(p => p.categoryId === args.where.categoryId)
            if (args?.where?.sellerId) products = products.filter(p => p.sellerId === args.where.sellerId)
            if (args?.where?.OR) {
              const search = args.where.OR[0]?.title?.contains || args.where.OR[0]?.description?.contains || ''
              products = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
            }
            if (args?.where?.condition) products = products.filter(p => p.condition === args.where.condition)
            if (args?.orderBy?.createdAt) products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            if (args?.orderBy?.price) products.sort((a, b) => args.orderBy.price === 'asc' ? a.price - b.price : b.price - a.price)
            return products.slice(args?.skip || 0, (args?.skip || 0) + (args?.take || 20)).map(p => getDemoProductById(p.id)!)
          },
          findUnique: async (args: any) => {
            const p = demoProducts.find(p => p.id === args?.where?.id)
            if (!p) return null
            return getDemoProductById(p.id)
          },
          count: async (args: any) => {
            let products = [...demoProducts]
            if (args?.where?.status) {
              products = products.filter(p => p.status === args.where.status)
            } else {
              products = products.filter(p => p.status === 'ACTIVE')
            }
            if (args?.where?.categoryId) products = products.filter(p => p.categoryId === args.where.categoryId)
            return products.length
          },
          create: async (args: any) => {
            const newId = `prod-${Date.now()}`
            demoProducts.unshift({ id: newId, ...args.data, status: 'ACTIVE', featured: false, createdAt: new Date(), updatedAt: new Date() } as any)
            return getDemoProductById(newId)!
          },
          update: async (args: any) => {
            const product = demoProducts.find(p => p.id === args.where.id)
            if (!product) return null
            Object.assign(product, args.data)
            product.updatedAt = new Date()
            return getDemoProductById(product.id)!
          },
          delete: async (args: any) => {
            const idx = demoProducts.findIndex(p => p.id === args.where.id)
            if (idx > -1) demoProducts.splice(idx, 1)
            return { id: args.where.id || 'deleted' }
          },
        },
        rFQ: {
          findMany: async (args: any) => {
            let rfqs = demoRFQs.filter(r => r.status === 'OPEN')
            if (args?.where?.buyerId) rfqs = demoRFQs.filter(r => r.buyerId === args.where.buyerId)
            return rfqs.slice(0, args?.take || 20)
          },
          count: async () => demoRFQs.filter(r => r.status === 'OPEN').length,
          create: async (args: any) => {
            const rfq = { id: `rfq-${Date.now()}`, ...args.data, _count: { offers: 0 }, buyer: demoUsers[0], category: demoCategories[0], createdAt: new Date(), offers: [] }
            demoRFQs.unshift(rfq as any)
            return rfq
          },
        },
        rFQOffer: {
          create: async () => ({ id: `offer-${Date.now()}`, status: 'PENDING' }),
          update: async () => ({}),
          updateMany: async () => ({}),
        },
        offer: {
          findMany: async () => [],
          create: async () => ({ id: `off-${Date.now()}`, status: 'PENDING', amount: 0 }),
          update: async () => ({}),
        },
        order: {
          create: async () => ({ id: `ord-${Date.now()}`, status: 'CREATED' }),
          findMany: async (args: any) => {
            let orders = [...demoOrders]
            if (args?.where?.status) orders = orders.filter(o => o.status === args.where.status)
            if (args?.where?.buyerId) orders = orders.filter(o => o.buyerId === args.where.buyerId)
            if (args?.where?.sellerId) orders = orders.filter(o => o.sellerId === args.where.sellerId)
            // Sort by newest first
            orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            const sliced = orders.slice(args?.skip || 0, (args?.skip || 0) + (args?.take || 50))
            return sliced.map(o => {
              const product = getDemoProductById(o.productId)
              const buyer = getDemoUserById(o.buyerId)
              const seller = getDemoUserById(o.sellerId)
              return { ...o, product, buyer, seller, payment: null, shipment: null }
            })
          },
          findUnique: async (args: any) => {
            const order = demoOrders.find(o => o.id === args?.where?.id)
            if (!order) return null
            return { ...order, product: getDemoProductById(order.productId), buyer: getDemoUserById(order.buyerId), seller: getDemoUserById(order.sellerId), payment: null, shipment: null }
          },
          count: async (args: any) => {
            let orders = [...demoOrders]
            if (args?.where?.status) orders = orders.filter(o => o.status === args.where.status)
            return orders.length
          },
          update: async (args: any) => {
            const order = demoOrders.find(o => o.id === args.where.id)
            if (!order) return null
            Object.assign(order, args.data)
            return order
          },
        },
        user: {
          findMany: async (args: any) => {
            return [...demoUsers]
          },
          findUnique: async (args: any) => {
            const u = demoUsers.find(u => u.id === args?.where?.id || u.email === args?.where?.email)
            return u || null
          },
          create: async (args: any) => {
            const newUser = { id: `user-${Date.now()}`, ...args.data, status: 'ACTIVE', createdAt: new Date() }
            demoUsers.unshift(newUser as any)
            return newUser
          },
          update: async (args: any) => {
            const idx = demoUsers.findIndex(u => u.id === args.where.id)
            if (idx === -1) return null
            Object.assign(demoUsers[idx], args.data)
            return demoUsers[idx]
          },
          delete: async (args: any) => {
            const idx = demoUsers.findIndex(u => u.id === args.where.id)
            if (idx > -1) demoUsers.splice(idx, 1)
            return { id: args.where.id || 'deleted' }
          },
          count: async (args: any) => {
            return demoUsers.length
          },
        },
        wishlistItem: {
          findMany: async () => demoProducts.slice(0, 3).map(p => ({ id: `wl-${p.id}`, userId: 'user-1', productId: p.id, createdAt: new Date(), product: getDemoProductById(p.id) })),
          findUnique: async () => null,
          create: async () => ({ id: `wl-new` }),
          delete: async () => ({}),
        },
        review: {
          findMany: async () => [],
          create: async () => ({ id: `rev-1` }),
          aggregate: async () => ({ _avg: { rating: 4.5 } }),
        },
        return: {
          findMany: async () => [],
          create: async () => ({ id: `ret-1`, status: 'REQUESTED' }),
          update: async () => ({}),
        },
        payment: {
          create: async () => ({ id: `pay-1`, stripePaymentIntentId: `pi_demo` }),
          update: async () => ({}),
          aggregate: async (args: any) => {
            if (args?._sum?.amount) return { _sum: { amount: 0 } }
            return { _sum: { amount: 0 } }
          },
        },
        shipment: {
          create: async () => ({ id: `ship-1` }),
          findUnique: async () => null,
        },
      }

      if (modelHandlers[model]) {
        return modelHandlers[model]
      }

      // If no demo handler, proxy to real prisma or return empty
      return target[model] ? new Proxy(target[model], {
        get(_: any, method: string) {
          return async (...args: any[]) => {
            if (USE_DEMO) {
              // Return empty results for unhandled models
              if (method === 'findMany') return []
              if (method === 'findUnique') return null
              if (method === 'count') return 0
              if (method === 'aggregate') return { _sum: { amount: 0 }, _count: 0 }
              if (method === 'create') return args[0]?.data || {}
              if (method === 'update') return {}
              if (method === 'delete') return {}
              return {}
            }
            return target[model][method](...args)
          }
        }
      }) : {}
    }
  })
}
