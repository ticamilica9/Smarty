import { notFound } from "next/navigation"
import { format } from "date-fns/format"
import { CalendarDays, User, ArrowLeft } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import type { MDXRemoteSerializeResult } from "next-mdx-remote"

import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getPost } from "@/lib/mdx"
import type { BlogPostFrontmatter } from "@/lib/mdx"

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

function BlogContent({ content }: { content: MDXRemoteSerializeResult }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none
      prose-headings:scroll-m-20 prose-headings:font-semibold prose-headings:tracking-tight
      prose-h1:text-3xl prose-h1:mt-10 prose-h1:mb-4
      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h2:border-b prose-h2:pb-2 prose-h2:border-border
      prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2
      prose-p:leading-7 prose-p:mb-4
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-strong:font-semibold
      prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
      prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
      prose-li:my-1
      prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic
      prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
      prose-pre:rounded-xl prose-pre:bg-muted prose-pre:border prose-pre:border-border
      prose-table:w-full prose-table:border-collapse
      prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-sm prose-th:font-medium
      prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-sm
      prose-hr:border-border
      prose-img:rounded-xl
    ">
      <MDXRemote source={content} />
    </div>
  )
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const { frontmatter } = post

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Blog", href: "/blog" },
          { label: frontmatter.title },
        ]}
        className="mb-6"
      />

      <article>
        {/* Post header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {frontmatter.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {format(new Date(frontmatter.date), "d MMMM yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="size-4" />
              {frontmatter.author}
            </span>
          </div>

          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {frontmatter.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <Separator className="mb-8" />

        {/* MDX content */}
        <BlogContent content={post.content} />

        {/* Footer */}
        <Separator className="my-10" />

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Inapoi la blog
          </a>
        </div>
      </article>
    </div>
  )
}
