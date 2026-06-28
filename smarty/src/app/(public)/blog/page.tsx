import Link from "next/link"
import { format } from "date-fns/format"
import { CalendarDays, User, ArrowRight } from "lucide-react"

import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getAllPosts } from "@/lib/mdx"

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Blog" }]} className="mb-6" />

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Blog Smarty</h1>
        <p className="mt-2 text-muted-foreground">
          Sfaturi, ghiduri si articole utile despre cumpararea si vanzarea produselor second-hand.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <p className="text-lg font-medium">Niciun articol momentan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Articolele vor aparea aici in curand.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-3">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {post.frontmatter.title}
                  </CardTitle>

                  <CardDescription className="line-clamp-3">
                    {post.frontmatter.excerpt}
                  </CardDescription>

                  {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {post.frontmatter.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <Separator />

                <CardFooter className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {format(new Date(post.frontmatter.date), "d MMM yyyy")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" />
                      {post.frontmatter.author}
                    </span>
                  </div>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
