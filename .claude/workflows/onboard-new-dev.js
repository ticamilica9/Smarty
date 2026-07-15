// onboard-new-dev.js
// Workflow: Onboard a new developer to the Smarty marketplace project
// Analyzes the project structure, explains architecture, and lists setup steps.

export const meta = {
  name: 'onboard-new-dev',
  description: 'Generate an onboarding guide for new developers: project map, architecture explanation, and setup steps',
  phases: [
    { title: 'Map' },
    { title: 'Explain' },
    { title: 'Setup' },
  ],
};

const PROJECT_ROOT = 'c:\\Users\\activ\\Projects\\SIte-ul lu\' asta';
const SMARTY_DIR = `${PROJECT_ROOT}\\smarty`;

// ---------------------------------------------------------------------------
// Phase 1 — Map the project structure
// ---------------------------------------------------------------------------
phase('Map');

log('Mapping project structure...');

const projectMap = await agent('Map project structure', {
  instructions: `You are analyzing the Smarty project to create a comprehensive project map for a new developer.

  The project is at ${SMARTY_DIR}. It is a peer-to-peer beauty marketplace (Romanian market).

  ## Tasks

  1. **Directory structure**: Map the key directories with their purpose:
     - \`src/app/\` — all route groups and routes (list each route group and its purpose)
     - \`src/components/\` — UI components (layout, product, auth, cart, notifications, etc.)
     - \`src/server/\` — server-side code (tRPC routers, auth, Stripe, Sameday, SSE)
     - \`src/lib/\` — library code (Prisma client, Redis, MinIO, utilities)
     - \`prisma/\` — database schema, migrations, seed
     - \`content/\` — MDX blog content
     - \`docs/\` — project documentation

  2. **Key files**: Identify and describe the 15 most important files for a new developer to understand:
     - \`prisma/schema.prisma\` — database schema
     - \`src/server/api/trpc.ts\` — tRPC context/init
     - \`src/server/api/root.ts\` — tRPC router root
     - \`src/server/auth.ts\` — NextAuth config
     - \`next.config.ts\` — Next.js configuration
     - \`package.json\` — dependencies and scripts
     - \`docker-compose.yml\` — local dev services
     - \`src/lib/prisma.ts\` — Prisma client
     - \`src/lib/redis.ts\` — Redis client
     - \`src/lib/minio.ts\` — MinIO/S3 client
     - \`src/lib/preview-mode.ts\` — Preview mode
     - \`src/server/stripe.ts\` — Stripe helpers
     - \`src/server/sameday.ts\` — Sameday shipping client
     - \`src/app/layout.tsx\` — Root layout (providers, theme)
     - \`src/components/providers/trpc-provider.tsx\` — tRPC provider

  3. **Read each of these files** (use Read tool) and summarize their purpose, exports, and key patterns.

  Output format:
  ## Project Map
  ### Route Structure (with path and purpose for each route group)
  ### Component Architecture (key components and their roles)
  ### Server Architecture (tRPC routers, external services)
  ### Library Layer (utilities, clients)
  ### Key Files Reference (table with file path, purpose, key exports)

  Be thorough — this is the primary reference for a new developer.`,

  onOutput: (output) => {
    log('Project map generated.');
  },
});

log('Phase complete: Project mapped.');

// ---------------------------------------------------------------------------
// Phase 2 — Architecture explanation and conventions
// ---------------------------------------------------------------------------
phase('Explain');

log('Creating architecture and conventions guide...');

const [architectureGuide, conventionsGuide] = await parallel(
  agent('Architecture explanation', {
    instructions: `You are explaining the Smarty project architecture to a new developer based on the project map.

  Project root: ${SMARTY_DIR}

  ## Context
  Smarty is a peer-to-peer beauty marketplace with the following flow:
  - Sellers list products (new or second-hand beauty items)
  - Buyers browse, negotiate via offers/counter-offers, or request quotes (RFQs)
  - Orders use escrow-style payment (Stripe) — funds held until delivery confirmed
  - Shipping via Sameday courier with easybox lockers
  - Returns, disputes, and reviews handle post-delivery

  ## Architecture Topics to Cover

  1. **Next.js 16 App Router**:
     - Route groups: \`(public)\` (homepage, products, auth pages), \`(account)\` (user dashboard), \`(admin)\` (admin panel), \`(auth)\` (login/register).
     - Server Components by default; client components where interactivity needed.
     - Standalone output mode for Docker deployment.
     - New Next.js 16 features/deprecations: this is Next.js 16 (not 14/15) — check \`node_modules/next/dist/docs/\` for migration notes.

  2. **tRPC Layer**:
     - API is fully tRPC (no REST routes except webhooks).
     - Server caller (\`src/lib/trpc/server.ts\`) for server-to-server calls.
     - React Query integration for client data fetching.
     - 11 routers: admin, category, offer, order, payment, product, return, review, rfq, shipping, user.
     - SuperJSON for serialization (Date, Decimal, etc. handled transparently).

  3. **Database (Prisma + PostgreSQL)**:
     - All models in \`prisma/schema.prisma\` with full relations.
     - Key enums: ProductStatus, OrderStatus, PaymentStatus (escrow lifecycle).
     - Postgres driver via \`@prisma/adapter-pg\` (not traditional binary).
     - Seed script at \`prisma/seed.ts\` for development data.

  4. **Authentication (NextAuth v5)**:
     - Prisma adapter for session/user storage.
     - Google OAuth provider configured.
     - JWT sessions (no database sessions).
     - Role-based access: \`user.role\` supports "USER" and "ADMIN".
     - Admin routes check role server-side.

  5. **External Services**:
     - **Stripe**: Payments + Connect escrow. Webhook at \`/api/webhooks/stripe\`.
     - **MinIO/S3**: File uploads (product images, return evidence). Local MinIO in dev.
     - **Sameday**: Romanian courier API for shipping and easybox lockers.
     - **Redis**: Caching, SSE (server-sent events) for real-time updates.
     - **Nodemailer**: Transactional emails.

  6. **Preview Mode**:
     - \`PREVIEW_MODE=true\` env var activates mock services.
     - \`src/server/preview-services.ts\` mocks Stripe, Sameday, S3, email.
     - \`src/lib/demo-data.ts\` / \`demo-prisma.ts\` for demo database.
     - Used for UI demos without real external dependencies.

  7. **Styling**:
     - Tailwind CSS v4 (not v3 — different config, uses CSS-based config).
     - shadcn/ui (base-nova style) with custom rose-berry palette.
     - CSS custom properties for theming, dark mode via next-themes.
     - Animations via \`tw-animate-css\`.

  Output a clear architecture document with:
  - System diagram (text-based: components and connections)
  - Data flow for the main use case (buyer purchases a product)
  - Each architecture topic explained with specifics from the codebase`,

    onOutput: (output) => log('Architecture guide created.'),
  }),

  agent('Project conventions', {
    instructions: `You are documenting the coding conventions and patterns for the Smarty project.

  Project root: ${SMARTY_DIR}

  Review the source files to extract conventions. Read at least:
  - One tRPC router (e.g., \`src/server/api/routers/product.ts\`)
  - One component (e.g., \`src/components/product/product-card.tsx\`)
  - The root layout (\`src/app/layout.tsx\`)
  - One page file (e.g., \`src/app/(public)/page.tsx\`)
  - One lib file (e.g., \`src/lib/utils.ts\`)
  - ESLint config (\`eslint.config.mjs\`)
  - TypeScript config (\`tsconfig.json\`)

  Document these conventions:

  1. **Code Style**:
     - Import ordering pattern (React, Next, third-party, local).
     - Naming conventions (PascalCase for components, camelCase for functions, etc.).
     - Type export pattern (\`type\` vs \`interface\`).

  2. **Component Patterns**:
     - Server vs Client component split: where and why \`"use client"\` is used.
     - shadcn/ui component usage pattern (import from \`@/components/ui/\`).
     - Form handling pattern.
     - Error boundaries and loading states.

  3. **tRPC Patterns**:
     - How routers are structured (procedure grouping).
     - Input validation (Zod schemas).
     - Auth middleware on procedures.
     - Error handling pattern.

  4. **Database Access**:
     - Prisma client import pattern (\`src/lib/prisma.ts\`).
     - Transaction usage.
     - Query patterns (include vs select, where clauses).

  5. **Routing Conventions**:
     - Route group naming (\`(public)\`, \`(account)\`, \`(admin)\`, \`(auth)\`).
     - Layout nesting.
     - Route protection (middleware vs layout checks).

  6. **Git Conventions**:
     - Commit message style (based on git log \`git log --oneline -20\`).
     - Branch naming convention (if any).

  Output as "## Project Conventions" with subsections for each category. Include specific code examples from the files you read.`,

    onOutput: (output) => log('Conventions guide created.'),
  })
);

log('Phase complete: Architecture and conventions documented.');

// ---------------------------------------------------------------------------
// Phase 3 — Setup steps
// ---------------------------------------------------------------------------
phase('Setup');

log('Generating setup instructions...');

const setupGuide = await agent('Create setup instructions', {
  instructions: `You are creating step-by-step setup instructions for a new developer joining the Smarty project.

  Project root: ${SMARTY_DIR}

  ## Steps to Document

  1. **Prerequisites**:
     - Node.js 20+ (check \`.nvmrc\` or \`FROM node:20-alpine\` in Dockerfile)
     - npm (package manager — lockfile is \`package-lock.json\` so npm is used)
     - Docker Desktop (for PostgreSQL, Redis, MinIO via docker-compose)
     - Git

  2. **Clone and Install**:
     - Clone from the repository URL.
     - \`cd smarty\` and \`npm ci\` (uses lockfile, preferred for consistency).
     - Postinstall runs \`prisma generate\` automatically.

  3. **Environment Variables**:
     - Copy \`.env.example\` to \`.env\`.
     - Explanation of each variable:
       - \`DATABASE_URL\` — PostgreSQL connection (use \`docker-compose.yml\` values)
       - \`AUTH_SECRET\` — generate with \`openssl rand --base64 32\`
       - \`AUTH_GOOGLE_ID\` / \`AUTH_GOOGLE_SECRET\` — create Google OAuth app at GCP Console
       - \`NEXT_PUBLIC_APP_URL\` — \`http://localhost:3000\` for local dev
       - \`REDIS_URL\` — \`redis://localhost:6379\` (docker-compose)
       - \`STRIPE_SECRET_KEY\` / \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\` — Stripe test keys
       - \`STRIPE_WEBHOOK_SECRET\` — for local webhook testing (\`stripe listen --forward-to localhost:3000/api/webhooks/stripe\`)
       - \`MINIO_*\` — for file uploads (docker-compose provides \`minioadmin\` / \`minioadmin\`)
       - \`SAMEDAY_*\` — Sameday shipping API credentials
     - Preview mode: \`cp .env.preview .env\` for demo mode (no external deps needed)

  4. **Start Infrastructure**:
     - \`docker compose up -d\` — starts PostgreSQL (5432), Redis (6379), MinIO (9000/9001)
     - Verify services: \`docker compose ps\`
     - MinIO console: \`http://localhost:9001\` (login: minioadmin/minioadmin)

  5. **Database Setup**:
     - \`npx prisma migrate dev\` — apply migrations
     - \`npx prisma db seed\` — populate with seed data
     - \`npx prisma studio\` — GUI for inspecting data (optional)

  6. **Run the Dev Server**:
     - \`npm run dev\` — starts on \`http://localhost:3000\`
     - \`npm run lint\` — check for lint issues

  7. **Build Check**:
     - \`npm run build\` — verify production build works (Next.js standalone)

  8. **Troubleshooting**:
     - **Port conflicts**: Edit \`docker-compose.yml\` port mappings if 5432/6379/9000 are in use.
     - **Prisma issues**: \`npx prisma generate\` after pulling schema changes.
     - **Next.js 16 docs**: Check \`node_modules/next/dist/docs/\` for API changes — this is not the Next.js you know.
     - **Auth issues**: Ensure \`AUTH_SECRET\` is set and \`AUTH_TRUST_HOST=true\` for local dev.
     - **Stripe webhooks**: Use \`stripe listen --forward-to localhost:3000/api/webhooks/stripe\` to test locally.
     - **Preview mode**: Set \`PREVIEW_MODE=true\` to run without real external services.
     - **MinIO bucket**: If uploads fail, ensure the \`smarty-uploads\` bucket exists (create via MinIO console at \`http://localhost:9001\`).

  9. **Available MCP Tools** (for Claude Code users):
     - **PostgreSQL MCP**: For direct database queries and inspection.
     - **Playwright MCP**: For browser automation and E2E testing.
     - **Vercel MCP**: For deployment management (\`smarty\` project in Vercel).
     - **GitHub MCP**: For PRs, issues, and repository management.

  10. **Project Management**:
      - Vercel project: \`smarty\` — auto-deploys from main branch
      - CI: No GitHub Actions yet; use \`ci-cd-review\` workflow for PR reviews
      - Documentation in \`docs/\` directory

  Output as a numbered setup guide with code blocks for each command. Make it practical — a new developer should be able to follow it step by step.`,

  onOutput: (output) => log('Setup guide generated.'),
});

log('Phase complete: Setup instructions ready.');

log('');
log('Onboarding workflow complete. The following artifacts were generated:');
log('1. Project Map — directory structure and key file references');
log('2. Architecture Guide — system design, data flow, service explanations');
log('3. Conventions Guide — coding patterns, naming, tRPC structure, git style');
log('4. Setup Guide — step-by-step instructions from clone to dev server');
