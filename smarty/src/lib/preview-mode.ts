/**
 * Preview mode detection.
 *
 * When PREVIEW_MODE=true (Vercel preview deployments), the app switches to
 * in-memory demo data + mock external services so it runs without any real
 * infrastructure (no PostgreSQL, Redis, Stripe, or S3).
 */

/**
 * Server-side check.  Reads process.env.PREVIEW_MODE.
 * Use in server components, API routes, and tRPC context.
 */
export function isPreviewMode(): boolean {
  return process.env.PREVIEW_MODE === 'true'
}

/**
 * Client-side flag.  Reads NEXT_PUBLIC_PREVIEW_MODE which is set at build time
 * by next.config.ts from PREVIEW_MODE.
 */
export const IS_PREVIEW_CLIENT =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'
