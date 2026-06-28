import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { serialize } from "next-mdx-remote/serialize"
import type { MDXRemoteSerializeResult } from "next-mdx-remote"

export interface BlogPostFrontmatter {
  title: string
  date: string
  author: string
  excerpt: string
  tags?: string[]
}

export interface BlogPostMeta {
  slug: string
  frontmatter: BlogPostFrontmatter
}

export interface BlogPostWithContent extends BlogPostMeta {
  content: MDXRemoteSerializeResult
}

const postsDirectory = path.join(process.cwd(), "content", "blog")

/**
 * Parse frontmatter from raw MDX string content.
 */
export function parseFrontmatter(raw: string): { frontmatter: BlogPostFrontmatter; content: string } {
  const { data, content } = matter(raw)
  return {
    frontmatter: {
      title: data.title ?? "",
      date: data.date ?? "",
      author: data.author ?? "",
      excerpt: data.excerpt ?? "",
      tags: data.tags ?? [],
    },
    content,
  }
}

/**
 * Read a single MDX file by slug and return both its frontmatter and serialized content.
 */
export async function getPost(slug: string): Promise<BlogPostWithContent | null> {
  const filePath = path.join(postsDirectory, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  const { frontmatter, content } = parseFrontmatter(raw)
  const mdxSource = await serialize(content, {
    mdxOptions: {
      development: process.env.NODE_ENV === "development",
    },
  })

  return { slug, frontmatter, content: mdxSource }
}

/**
 * Get all blog posts sorted by date (newest first).
 */
export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)

  const posts = fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "")
      const raw = fs.readFileSync(path.join(postsDirectory, fileName), "utf-8")
      const { frontmatter } = parseFrontmatter(raw)
      return { slug, frontmatter }
    })
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime())

  return posts
}
