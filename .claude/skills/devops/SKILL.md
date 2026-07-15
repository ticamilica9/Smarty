---
name: devops
description: Use when deploying to Vercel, containerizing with Docker, setting up CI/CD pipelines, managing environment variables and secrets, configuring monitoring and logging, or managing domains and SSL certificates
---

# DevOps

## Overview

Ship reliably with automated, repeatable infrastructure. This skill covers Vercel deployment strategies, Docker containerization, CI/CD pipeline design, environment and secret management, monitoring, logging, and domain/SSL configuration.

**Core principle:** Everything that can be automated must be automated. If you do it twice, script it. If you script it, CI runs it.

## Vercel Deployment Strategies

### Preview vs Production

| Environment | Trigger | Domain | Env Vars |
|-------------|---------|--------|----------|
| Preview | Every push to any branch (except default) | `pr-{number}.project.vercel.app` | Preview-scoped |
| Production | Push/merge to default branch | Custom domain | Production-scoped |

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### Environment-Specific Variables

```bash
# .env.local -- local development only, never committed
# .env.preview -- applied to preview deployments
# .env.production -- applied to production deployment
```

**Vercel CLI commands:**
```bash
vercel env add DATABASE_URL production   # Add production secret
vercel env pull                           # Pull env vars locally
vercel list                               # List deployments
vercel logs <deployment-url>              # View deployment logs
```

### Branch-Based Deployment Strategy

1. **Feature branch** -- deploys to Preview, auto-generated URL
2. **Staging branch** (`staging`) -- deploys to staging domain, production-like env
3. **Main branch** (`main`) -- deploys to production domain

```bash
# Promote preview to production
vercel promote <deployment-url> --yes

# Rollback
vercel rollback <deployment-url>
```

## Docker Containerization

### Multi-Stage Builds

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Dockerfile Best Practices

| Rule | Rationale |
|------|-----------|
| Pin base image versions | `node:20-alpine` not `node:latest` |
| Use `.dockerignore` | Prevent secrets and node_modules from leaking into build context |
| Order layers by change frequency | Rarely-changing layers first (deps), frequently-changing last (source) |
| Single application per container | Easier scaling, debugging, health checks |
| Non-root user | Security best practice |
| Health checks | Required for orchestration |

```dockerignore
node_modules
.git
.env
.env*.local
*.md
.gitignore
```

### Docker Compose for Development

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env.local
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules  # anonymous volume prevents overwriting

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## CI/CD Pipeline Design

### GitHub Actions: Build -> Test -> Deploy

```yaml
name: CI/CD
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage

  build:
    needs: quality
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: >-
            ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

### Pipeline Principles

- **Fail fast:** Lint and typecheck before build
- **Cache aggressively:** `actions/setup-node` with `cache: "npm"`, Docker layer caching
- **Secrets in, secrets out:** Never echo secrets to logs, use `${{ secrets.* }}`
- **Idempotent deploys:** Same commit always produces the same deployment
- **Deploy gate:** Merge to main is not a deploy; deploy is a separate action

## Environment Management

### File Priority (highest wins)

```
.env.local              # Local overrides (gitignored)
.env.preview            # Preview environment
.env.production         # Production environment
.env                    # Default (committed with safe defaults)
```

### Secret Management

| Platform | Mechanism | Notes |
|----------|-----------|-------|
| Vercel | `vercel env add` | Scoped by environment |
| GitHub | `Settings > Secrets > Actions` | `${{ secrets.NAME }}` |
| Local | `.env.local` (gitignored) | Never commit secrets |
| CI | `env:` block in workflow | Only for non-sensitive env vars |

**Never:**
- Commit `.env*.local` files
- Log secrets or environment variables in CI output
- Hardcode secrets in Dockerfiles -- use build args for non-sensitive values, runtime env vars for secrets
- Share secrets over chat or email

### Vercel-Specific Env Vars

```bash
# Available at runtime
VERCEL_ENV           # "production" | "preview" | "development"
VERCEL_URL           # Deployment URL
VERCEL_REGION        # Server region
NEXT_PUBLIC_VERCEL_URL  # Public-facing URL (Next.js)

# Conditional logic in code
const isProduction = process.env.VERCEL_ENV === "production";
const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
```

## Monitoring and Logging

### Vercel Analytics

- **Web Analytics:** Page views, top pages, referrers (privacy-friendly, no cookie banner needed)
- **Speed Insights:** Core Web Vitals (LCP, CLS, INP) per route

Enable in `vercel.json`:
```json
{
  "analytics": {
    "enabled": true
  }
}
```

### Error Tracking

| Tool | Setup |
|------|-------|
| Sentry | `npm install @sentry/nextjs` + `npx @sentry/wizard -i nextjs` |
| Highlight | `npm install highlight.run` + `<HighlightInit />` |
| Datadog RUM | `@datadog/browser-rum` initialization in app/layout |

### Structured Logging

```typescript
// Avoid console.log -- use structured logging
const log = (event: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    environment: process.env.VERCEL_ENV,
    ...data,
  }));
};

log("order.created", { orderId, userId, total });
```

**Log levels:**
| Level | When | Action |
|-------|------|--------|
| `debug` | Development only | Ignore in production |
| `info` | Normal operations (order created, user signed up) | Dashboard |
| `warn` | Unexpected but handled (rate limit hit, retry triggered) | Alert if trending up |
| `error` | Operation failed (payment declined, DB connection lost) | Immediate alert |

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const dbOk = await checkDatabaseConnection();
  return Response.json(
    { status: dbOk ? "healthy" : "degraded", timestamp: new Date().toISOString() },
    { status: dbOk ? 200 : 503 }
  );
}
```

## Domain and SSL Management

### Custom Domain on Vercel

```bash
# Add domain
vercel domain add example.com

# Verify ownership via DNS record (CNAME or TXT)
# Then configure DNS:
#   example.com -> CNAME to cname.vercel-dns.com
#   www.example.com -> CNAME to cname.vercel-dns.com
```

### DNS Records

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `example.com` | A | `76.76.21.21` | Apex domain (Vercel IP) |
| `example.com` | AAAA | `2600:...` | IPv6 apex domain |
| `www.example.com` | CNAME | `cname.vercel-dns.com` | WWW subdomain |
| `api.example.com` | CNAME | `cname.vercel-dns.com` | API subdomain (separate project) |
| `vercel.domain` | TXT | `vercel-site-verification=...` | Domain verification |

### SSL/TLS

- Vercel provides auto-renewing SSL (Let's Encrypt) for all custom domains
- Set `"ssl": true` per domain in `vercel.json` for strict mode
- Enforce HTTPS redirects:
  ```json
  {
    "redirects": [
      { "source": "http://example.com/(.*)", "destination": "https://example.com/$1", "permanent": true }
    ]
  }
  ```

## Quick Reference

```bash
# Vercel
vercel                              # Deploy to preview
vercel --prod                       # Deploy to production
vercel env pull                     # Pull remote env vars
vercel logs <url>                   # View deployment logs
vercel domains ls                   # List custom domains
vercel inspect <url>                # Deployment details
vercel rollback                     # Rollback to previous

# Docker
docker build -t app:latest .        # Build image
docker compose up -d                # Start services
docker compose logs -f              # Follow logs
docker system prune -af             # Clean everything

# Git
git tag v1.2.3                      # Tag release
git push origin --tags              # Push tags (triggers release deploy)
```

## Common Mistakes

### Mixing env scopes
A Preview deployment using production database credentials can corrupt real data. Always triple-check environment variable scoping.

### Large Docker images
Each unnecessary layer adds to build time and attack surface. Use Alpine-based images, multi-stage builds, and `.dockerignore`.

### No health checks
Orchestrators won't know your app is unhealthy without a probe. Always implement `/api/health` and configure health checks.

### Hardcoded domains
Hardcoding `http://localhost:3000` breaks on Vercel. Use `process.env.VERCEL_URL` or `NEXT_PUBLIC_VERCEL_URL`.

### Secrets in build logs
`npm install` or build scripts that `echo` env vars leak secrets. Mask them in CI with `::add-mask::`.

## Red Flags

- Environment variables hardcoded in source files
- Docker images built with secrets embedded in layers
- No staging environment between preview and production
- CI pipeline skips linting or typechecking
- Manual SSH into production servers for debugging
- No monitoring or error tracking configured
- SSL certificates managed manually or expired
- `.env` files committed to version control with real secrets
