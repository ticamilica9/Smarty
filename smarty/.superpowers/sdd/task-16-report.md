# Task 16: Blog with MDX Support

## Summary

Implemented a blog system using `next-mdx-remote` for runtime MDX rendering. Blog posts are stored as `.mdx` files in `content/blog/` and rendered server-side with full frontmatter parsing.

## Files Created

### 1. `content/blog/primul-articol.mdx` -- Sample blog article
- Romanian skincare guide for mixed skin types ("Ghid complet pentru ingrijirea tenului mixt")
- Includes YAML frontmatter (title, date, author, excerpt, tags)
- Features markdown content with headings, tables, blockquotes, lists, and links to platform categories

### 2. `src/lib/mdx.ts` -- MDX utility library
- **`parseFrontmatter(raw)`** -- Uses `gray-matter` to extract YAML frontmatter from raw MDX content. Returns typed `BlogPostFrontmatter` (title, date, author, excerpt, tags).
- **`getPost(slug)`** -- Reads a single `.mdx` file from `content/blog/{slug}.mdx`. Parses frontmatter and serializes the MDX body using `next-mdx-remote/serialize`. Returns `null` if the file does not exist (triggers 404).
- **`getAllPosts()`** -- Reads all `.mdx` files in `content/blog/`, parses frontmatter, and returns them sorted by date (newest first). Returns an empty array if the directory does not exist.

### 3. `src/app/(public)/blog/page.tsx` -- Blog listing page
- **Route**: `/blog`
- Server component that renders a grid of blog post cards
- Each card shows: title, excerpt (3-line clamp), tags as badges, date (formatted via `date-fns`), author, and an arrow indicator
- Empty state: "Niciun articol momentan" centered message with dashed border
- Breadcrumbs with "Blog" label
- Follows the same Card component pattern used across the project

### 4. `src/app/(public)/blog/[slug]/page.tsx` -- Individual blog post page
- **Route**: `/blog/{slug}`
- Server component using `next-mdx-remote/rsc` `MDXRemote` to render serialized MDX
- Calls `getPost(slug)` and triggers `notFound()` if the post does not exist
- Layout: breadcrumbs (Blog > Post Title), article header with title, date, author, tags, separator, MDX content area, footer with "Inapoi la blog" link
- MDX content is styled with Tailwind `prose` classes: headings (with border-bottom on h2), paragraphs, links (primary color), blockquotes (with left border), code blocks, tables, and images

## Files Modified

### 5. `package.json` / `package-lock.json` -- Dependencies
- Added `next-mdx-remote` (runtime MDX rendering)
- Added `gray-matter` (frontmatter parsing)

## Key Design Decisions

- **Runtime MDX** over build-time compilation: `next-mdx-remote` allows adding new `.mdx` files without rebuilding. Content changes are reflected on the next request.
- **File-system based content**: Posts live in `content/blog/` as plain `.mdx` files. No database needed. The slug is derived from the filename.
- **Server components only**: Both pages are server components. MDX is rendered on the server, no client-side JavaScript needed for reading posts.
- **Frontmatter via gray-matter**: Proper YAML frontmatter parsing with typed TypeScript interfaces, rather than manual regex parsing.
- **Typography styling via Tailwind prose**: MDX content gets consistent styling via the `prose` class with dark mode support (`dark:prose-invert`), matching the rest of the site's design system.

## Build Status

- Build: **PASS** (Next.js 16.2.9, Turbopack)
- Commit: `1305453` - `feat: add blog with MDX support`
- New routes: `/blog` (listing), `/blog/[slug]` (individual post)
- Both routes are dynamic (server-rendered on demand)
