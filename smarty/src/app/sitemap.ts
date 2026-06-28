import type { MetadataRoute } from 'next'
import { api } from '@/lib/trpc/server'
import { getAllPosts } from '@/lib/mdx'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // --- Static pages ---
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/categorii`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cereri`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  // --- Dynamic data ---
  const caller = await api()

  // Categories
  let categoryPages: MetadataRoute.Sitemap = []
  try {
    const categories = await caller.category.getAll()
    categoryPages = categories.map((cat: any) => ({
      url: `${baseUrl}/categorii/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Gracefully degrade: skip dynamic categories on failure
  }

  // Products (latest active, up to 50)
  let productPages: MetadataRoute.Sitemap = []
  try {
    const products = await caller.product.getLatest({ limit: 50 })
    productPages = products.map((product: any) => ({
      url: `${baseUrl}/produse/${product.id}`,
      lastModified: product.updatedAt ?? product.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Gracefully degrade
  }

  // Blog posts (from MDX files)
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = getAllPosts()
    blogPages = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.frontmatter.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // Gracefully degrade
  }

  // RFQs (open, up to 100)
  let rfqPages: MetadataRoute.Sitemap = []
  try {
    const rfqs = await caller.rfq.getAll({ limit: 100 })
    rfqPages = rfqs.rfqs.map((rfq: any) => ({
      url: `${baseUrl}/cereri/${rfq.id}`,
      lastModified: rfq.updatedAt ?? rfq.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    // Gracefully degrade
  }

  return [
    ...staticPages,
    ...categoryPages,
    ...productPages,
    ...blogPages,
    ...rfqPages,
  ]
}
