# Task 20: Docker Deployment — Report

## Summary

Added Docker deployment configuration for Smarty Marketplace: a multi-stage Dockerfile, .dockerignore, and updated Next.js config for standalone output.

## Files Created

### `Dockerfile` — Multi-stage build

Three-stage build (deps → builder → runner):

| Stage | Base | Purpose |
|---|---|---|
| `deps` | `node:20-alpine` | Install all dependencies via `npm ci` |
| `builder` | `node:20-alpine` | Generate Prisma client, run `next build` with standalone output |
| `runner` | `node:20-alpine` | Minimal runtime image with non-root `nextjs` user, copies standalone output, static assets, public files, and Prisma client |

- Runs on port 3000 with `HOSTNAME=0.0.0.0`
- `NEXT_TELEMETRY_DISABLED=1` set in builder and runner
- Uses `addgroup`/`adduser` for non-root execution

### `.dockerignore` — Build context exclusions

Excludes from the Docker build context:
- `node_modules`, `.git`, `.env`, `.next`, `docs`, `.gitignore`, `*.md`

## Files Modified

### `next.config.ts` — Standalone output and image remote patterns

- Added `output: 'standalone'` for tracing and minimal Docker image
- Added `images.remotePatterns`:
  - `http://localhost:9000/**` — MinIO (local S3-compatible storage)
  - `https://lh3.googleusercontent.com/**` — Google auth avatars
  - `https://**.r2.dev/**` — Cloudflare R2 (production S3-compatible)

## Build Verification

Docker build (`docker build -t smarty .`) could not be completed in the current environment (Docker daemon not reachable). The Dockerfile is expected to produce a working image on any system with Docker installed.

To build and run:
```bash
docker build -t smarty .
docker run -p 3000:3000 --env-file .env smarty
```

The existing `docker-compose.yml` (from Task 1) provides the infrastructure services (PostgreSQL, Redis, MinIO). In production, add the `smarty` service to compose:
```yaml
services:
  smarty:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis
      - minio
```

## Commit

`git commit -m "feat: add Docker deployment configuration"`
