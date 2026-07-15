// ci-cd-review.js
// Workflow: Automated PR Review for the Smarty project
// Runs against the current diff and produces a comprehensive review report.

export const meta = {
  name: 'ci-cd-review',
  description: 'Run automated code review on the current PR diff covering security, performance, and correctness',
  phases: [
    { title: 'Diff' },
    { title: 'Review' },
    { title: 'Synthesize' },
    { title: 'Apply' },
  ],
};

const WORKSPACE = 'c:\\Users\\activ\\Projects\\SIte-ul lu\' asta';

// ---------------------------------------------------------------------------
// Phase 1 — Collect the diff
// ---------------------------------------------------------------------------
phase('Diff');

const diffResult = await agent('Collect git diff', {
  instructions: `You are in the Smarty project at ${WORKSPACE}.

  1. Run \`git diff --cached\` to get the staged diff. If that's empty, run \`git diff\` (unstaged changes).
  2. If both are empty, check if there's a branch-based diff against main: \`git diff origin/main...HEAD\`.
  3. Output the full diff output. If there's no diff at all, output "NO_DIFF".
  4. Also run \`git diff --stat\` for a file summary.`,

  onOutput: (output) => {
    if (output.trim() === 'NO_DIFF') {
      log('No changes detected. Workflow cancelled.');
      return;
    }
    log(`Diff collected: ${output.split('\n').length} lines`);
  },
});

const diff = diffResult.output;
const changedFiles = diffResult.additionalOutput || '';

log('Phase complete: Diff captured.');

// ---------------------------------------------------------------------------
// Phase 2 — Parallel code reviews (security, performance, correctness)
// ---------------------------------------------------------------------------
phase('Review');

log('Launching parallel review agents...');

const [securityReview, performanceReview, correctnessReview] = await parallel(
  agent('Security review', {
    instructions: `You are a security-focused code reviewer for the Smarty project (a peer-to-peer marketplace).

Review the following git diff for security vulnerabilities. Be specific about file:line references.

## Smarty Project Context
- Next.js 16 app with NextAuth v5, Prisma + PostgreSQL, Stripe, MinIO/S3
- tRPC server in src/server/trpc/
- Preview mode toggle via PREVIEW_MODE env var
- File uploads to MinIO/S3, payments via Stripe escrows

## Security Checklist
- **Auth bypass**: Every protected route/API must check session. No client-only auth.
- **SQL/NoSQL injection**: Prisma parameterized queries used? No raw SQL string concatenation?
- **Hardcoded secrets**: Any API keys, tokens, passwords in the diff?
- **XSS**: Any \`dangerouslySetInnerHTML\`, unescaped user content, or \`document.write\`?
- **CSRF**: State-changing tRPC mutations should use NextAuth CSRF tokens.
- **Open redirect**: Any \`redirect()\` with user-controlled \`searchParams\`?
- **File upload**: File type/size validation before upload? Path traversal in filenames?
- **Rate limiting**: Login/register endpoints need rate limiting (use Redis from \`src/server/redis.ts\`).
- **Stripe**: Payment amounts validated server-side? No client-side price manipulation.
- **Insecure direct object references (IDOR)**: Users accessing other users' orders/products?

## Output Format
For each finding:
- **SEVERITY**: CRITICAL | HIGH | MEDIUM | LOW
- **File**: (from diff)
- **Issue**: What the problem is
- **Fix**: Concrete, actionable fix
- **Why**: Business/security impact

If no issues found, output: "No security issues detected."`,

    onOutput: (output) => log('Security review completed.'),
  }),

  agent('Performance review', {
    instructions: `You are a performance-focused code reviewer for the Smarty project (a peer-to-peer marketplace).

Review the following git diff for performance issues.

## Smarty Project Context
- Next.js 16 app (standalone output), Prisma + PostgreSQL, Redis
- Image hosting via MinIO/S3 with next/image
- Mobile-first marketplace with optimizePackageImports for lucide-react
- tRPC for data fetching (consider request batching)

## Performance Checklist
- **N+1 queries**: Prisma queries in loops? Missing \`include\` or \`select\`?
- **Missing indexes**: Filtered/sorted columns in Prisma schema that lack indexes?
- **Bundle size**: Large imports from individual modules (e.g. \`import * from 'lucide-react'\`)?
- **Images**: Using \`next/image\` with proper sizes/widths? Lazy loading?
- **Re-renders**: New objects/arrays in React render? Missing \`useMemo\`/\`useCallback\` on expensive computations?
- **Server/client split**: Expensive calculations on server? Data fetching in server components vs client?
- **tRPC**: Batched queries where possible? Using \`httpBatchLink\`?
- **Redis**: Repeated DB queries that should be cached? Check \`src/server/redis.ts\` usage.

## Output Format
For each finding:
- **SEVERITY**: HIGH | MEDIUM | LOW
- **File**: (from diff)
- **Issue**: What the problem is
- **Fix**: Concrete, actionable fix
- **Impact**: Estimated performance improvement

If no issues found, output: "No performance issues detected."`,

    onOutput: (output) => log('Performance review completed.'),
  }),

  agent('Correctness review', {
    instructions: `You are a correctness reviewer for the Smarty project (a peer-to-peer marketplace).

Review the following git diff for correctness bugs and logic errors.

## Smarty Project Context
- Peer-to-peer marketplace with: Product listings, Offers, RFQs, Orders, Payments (Stripe escrow), Returns
- Prisma schema in \`prisma/schema.prisma\` — states: ProductStatus, OrderStatus, PaymentStatus, ReturnStatus
- tRPC mutations for all state changes (src/server/trpc/)
- Preview mode in src/server/preview-mode.ts and preview-services.ts
- Auth via NextAuth v5 with Google OAuth

## Correctness Checklist
- **State transitions**: Are order/payment/return status transitions valid? (e.g. CREATED -> PAID -> SHIPPED -> DELIVERED)
- **Edge cases**: Empty states, undefined/null handling, max decimal precision for prices
- **Error handling**: Failed Stripe payments, Sameday API errors, S3 upload failures — are they caught and handled?
- **Race conditions**: Concurrent offer acceptance? Double-spend on escrow? Check for Prisma transactions.
- **Data validation**: Zod schemas (in the project) — are inputs validated server-side? Not just client-side?
- **Auth checks**: Do seller-only actions verify \`user.role\`? Do buyer-only actions verify?
- **Preview mode**: Does new code short-circuit correctly when PREVIEW_MODE is active?
- **File uploads**: Deleted temp files? Proper cleanup on error?
- **Async/await**: Missing \`await\`? Promise chains without error handlers?

## Output Format
For each finding:
- **SEVERITY**: CRITICAL | HIGH | MEDIUM | LOW
- **File**: (from diff)
- **Issue**: What the bug is (trace the logic)
- **Fix**: Concrete code fix
- **Test**: How to reproduce / what test would catch it

If no issues found, output: "No correctness issues detected."`,

    onOutput: (output) => log('Correctness review completed.'),
  })
);

log('All parallel reviews complete.');

// ---------------------------------------------------------------------------
// Phase 3 — Synthesize findings into a unified report
// ---------------------------------------------------------------------------
phase('Synthesize');

log('Synthesizing review findings...');

const report = await agent('Synthesize review report', {
  instructions: `You are a senior engineering lead synthesizing code review feedback for the Smarty project.

You have three review reports: Security, Performance, and Correctness. Merge them into a single, cohesive PR review report.

## Input Reports

### Security Report
${securityReview.output}

### Performance Report
${performanceReview.output}

### Correctness Report
${correctnessReview.output}

## Output Requirements
1. **Executive Summary**: 2-3 sentences on overall PR health.
2. **CRITICAL items first**: Anything that blocks merging (security holes, data loss bugs).
3. **HIGH items second**: Significant issues that should be fixed before production.
4. **MEDIUM items**: Important but not blocking.
5. **LOW items / Nitpicks**: Style, minor improvements.
6. **Positive feedback**: Things the author did well.

For each identified issue, include the original SEVERITY, File, Issue, and Fix from the source report. Group by severity. De-duplicate findings that appear in multiple reports.

Also add a section:
- **AI-Applicable Fixes**: Items from LOW/MEDIUM that are safe to apply automatically (formatting, imports, type annotations).`,

  onOutput: (output) => log('Synthesis complete.'),
});

log('Phase complete: Report synthesized.');

// ---------------------------------------------------------------------------
// Phase 4 — Apply safe fixes (formatting, imports, minor cleanup)
// ---------------------------------------------------------------------------
phase('Apply');

log('Identifying safe auto-fixable issues...');

const autoFixResult = await agent('Apply safe fixes', {
  instructions: `You are an automated code fixer for the Smarty project.

The following PR review identified safe-to-apply fixes. Apply ONLY these categories:
1. **Import sorting / missing imports** — Add missing imports, fix order.
2. **Formatting** — Trailing commas, indentation, semicolons (matching project ESLint config).
3. **Type annotations** — Add explicit return types where obviously correct.
4. **Dead code removal** — Remove commented-out code blocks.
5. **Console.log removal** — Remove stray debug console.log statements.

DO NOT touch:
- Business logic
- API calls
- Database queries
- Auth checks
- Any code you're unsure about

If there are no safe fixes to apply, output: "No auto-fixable issues found."

After applying changes, run: \`npx eslint --fix .\` in ${WORKSPACE} to let ESLint auto-format.`,

  onOutput: (output) => {
    if (output.includes('No auto-fixable issues found')) {
      log('No safe fixes to apply.');
    } else {
      log('Auto-fixes applied successfully.');
    }
  },
});

log('CI/CD Review workflow complete.');
