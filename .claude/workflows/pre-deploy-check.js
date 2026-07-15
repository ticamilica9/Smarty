// pre-deploy-check.js
// Workflow: Pre-deployment verification for the Smarty project
// Runs before deploying to Vercel. Verifies build, tests, security, and docs.

export const meta = {
  name: 'pre-deploy-check',
  description: 'Verify build, run tests, audit security, and update deployment notes before Vercel deploy',
  phases: [
    { title: 'Check' },
    { title: 'Test' },
    { title: 'Audit' },
    { title: 'Docs' },
  ],
};

const PROJECT_ROOT = 'c:\\Users\\activ\\Projects\\SIte-ul lu\' asta';
const SMARTY_DIR = `${PROJECT_ROOT}\\smarty`;

// ---------------------------------------------------------------------------
// Phase 1 — Build check and env var verification
// ---------------------------------------------------------------------------
phase('Check');

log('Starting build verification and environment check...');

const envVars = [
  { name: 'DATABASE_URL', required: true, purpose: 'PostgreSQL connection via Prisma' },
  { name: 'AUTH_SECRET', required: true, purpose: 'NextAuth encryption' },
  { name: 'AUTH_GOOGLE_ID', required: false, purpose: 'Google OAuth' },
  { name: 'AUTH_GOOGLE_SECRET', required: false, purpose: 'Google OAuth' },
  { name: 'NEXT_PUBLIC_APP_URL', required: true, purpose: 'Public app URL' },
  { name: 'REDIS_URL', required: true, purpose: 'Redis connection (ioredis)' },
  { name: 'STRIPE_SECRET_KEY', required: true, purpose: 'Stripe payments' },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, purpose: 'Stripe client key' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true, purpose: 'Stripe webhook verification' },
  { name: 'MINIO_ENDPOINT', required: false, purpose: 'S3-compatible storage' },
  { name: 'MINIO_ACCESS_KEY', required: false, purpose: 'MinIO credentials' },
  { name: 'MINIO_SECRET_KEY', required: false, purpose: 'MinIO credentials' },
  { name: 'MINIO_BUCKET', required: false, purpose: 'File upload bucket' },
  { name: 'SAMEDAY_API_URL', required: false, purpose: 'Sameday shipping API' },
  { name: 'SAMEDAY_USERNAME', required: false, purpose: 'Sameday credentials' },
  { name: 'SAMEDAY_PASSWORD', required: false, purpose: 'Sameday credentials' },
];

const [buildResult, envResult] = await parallel(
  agent('Build check', {
    instructions: `You are checking whether the Smarty project builds successfully at ${SMARTY_DIR}.

    1. Run \`cd "${SMARTY_DIR}" && npm run build\` (Next.js build).
    2. Capture the full output.
    3. Determine: Did the build succeed or fail?
    4. If it failed, extract the key errors (TypeScript errors, module not found, etc.).
    5. Output a clear PASS/FAIL verdict with the build output.

    Note: The project uses Next.js 16 with standalone output mode.`,

    onOutput: (output) => {
      if (output.includes('FAIL') || output.includes('Error')) {
        log('Build check: FAILED');
      } else {
        log('Build check: PASSED');
      }
    },
  }),

  agent('Environment check', {
    instructions: `You are verifying environment variables for the Smarty project at ${SMARTY_DIR}.

    1. Read the file at ${SMARTY_DIR}\\.env (the production/local env file).
    2. Read the file at ${SMARTY_DIR}\\.env.example (the reference).
    3. Read the file at ${SMARTY_DIR}\\.env.preview (preview mode, if present).
    4. Check for each environment variable below.

    Required env vars that MUST be set (non-empty, not placeholder values):
    - DATABASE_URL (PostgreSQL connection string)
    - AUTH_SECRET (NextAuth encryption key — must be a real base64 value)
    - NEXT_PUBLIC_APP_URL (must match the Vercel deployment URL)
    - REDIS_URL (Redis connection)
    - STRIPE_SECRET_KEY (live or test key)
    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    - STRIPE_WEBHOOK_SECRET

    Optional but recommended:
    - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (for Google OAuth)
    - MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET (file storage)
    - SAMEDAY_API_URL / SAMEDAY_USERNAME / SAMEDAY_PASSWORD (shipping)

    Flag any:
    - Missing required env vars (empty string or absent)
    - Placeholder values that look like "your-..." or "sk_test_..." for live deploy
    - Mismatch between .env.example and what .env has (new vars added to example but not .env)
    - Hardcoded secrets in source files (search src/ for hardcoded API keys)

    Output: a table of all env vars with status (OK / MISSING / PLACEHOLDER) and recommendations.`,

    onOutput: (output) => {
      const missing = (output.match(/MISSING/g) || []).length;
      const placeholder = (output.match(/PLACEHOLDER/g) || []).length;
      if (missing > 0 || placeholder > 0) {
        log(`Environment check: ${missing} missing, ${placeholder} placeholders found.`);
      } else {
        log('Environment check: All OK.');
      }
    },
  })
);

log('Phase complete: Build and env checks done.');

// ---------------------------------------------------------------------------
// Phase 2 — Run tests
// ---------------------------------------------------------------------------
phase('Test');

log('Running available tests...');

const testResult = await agent('Test runner', {
  instructions: `You are running the test suite for the Smarty project at ${SMARTY_DIR}.

  This project uses Next.js 16 but does NOT have Vitest, Playwright, or Jest configured yet (no test files found). However, there IS a Playwright MCP available.

  Steps:
  1. Check if any test files exist: look for files matching *.test.*, *.spec.*, __tests__/ directories.
  2. Check package.json for test-related scripts (test, test:e2e, test:watch, etc.).
  3. If tests exist, run them using the appropriate command:
     - Vitest: \`npx vitest run\` (or \`npx vitest --reporter=verbose\`)
     - Jest: \`npx jest\`
     - Playwright E2E: use the Playwright MCP tools (if available and configured)
  4. If NO tests exist:
     - Run \`npx tsc --noEmit\` to type-check.
     - Run \`npx eslint .\` (or \`npx next lint\`) to check lint.
     - Report: "No test suite configured. Ran type-check and lint instead."

  Output:
  - PASS/FAIL for each test type that ran.
  - Any test failures with file:line and error message.
  - Summary table of results.`,

  onOutput: (output) => {
    if (output.includes('FAIL')) {
      log('Tests: Some checks failed.');
    } else {
      log('Tests: All checks passed.');
    }
  },
});

log('Phase complete: Testing done.');

// ---------------------------------------------------------------------------
// Phase 3 — Security audit and hardcoded secrets check
// ---------------------------------------------------------------------------
phase('Audit');

log('Running security audit...');

const [secretAudit, depAudit] = await parallel(
  agent('Hardcoded secrets scan', {
    instructions: `You are auditing the Smarty project source code at ${SMARTY_DIR} for hardcoded secrets.

  Scan ALL files recursively (excluding node_modules, .next, .vercel) for:

  1. **API Keys & Tokens**: Patterns like \`sk_live_\`, \`sk_test_\`, \`pk_live_\`, \`pk_test_\`, \`ghp_\`, \`xoxp-\`, \`xoxb-\`
  2. **Hardcoded passwords**: Any string values that look like passwords (not in .env files)
  3. **Private keys**: \`-----BEGIN (RSA | EC | OPENSSH) PRIVATE KEY-----\`
  4. **Connection strings with credentials**: \`postgresql://user:password@\` (outside .env files)
  5. **JWT tokens / auth tokens**: Hardcoded tokens in source
  6. **Stripe keys**: Any Stripe key in source files (should only be in .env)

  Ignore:
  - Files inside .env*, .env.example, .env.preview
  - node_modules, .next, .vercel directories
  - Test files with mock keys (but flag them with NOTE)

  Use grep to search: \`cd "${SMARTY_DIR}" && grep -rn --include="*.{ts,tsx,js,jsx}" -E "(sk_live_|sk_test_|pk_live_|pk_test_|ghp_|-----BEGIN )" src/ 2>/dev/null\` or similar.

  Output table:
  | File | Line | Finding | Severity | Action Needed |`,

    onOutput: (output) => {
      if (output.includes('CRITICAL') || output.includes('HIGH')) {
        log('Secrets scan: CRITICAL or HIGH findings — review required before deploy.');
      } else if (output.includes('LOW') || output.includes('MEDIUM')) {
        log('Secrets scan: Minor findings found.');
      } else {
        log('Secrets scan: No secrets found in source.');
      }
    },
  }),

  agent('Dependency audit', {
    instructions: `You are auditing npm dependencies for the Smarty project at ${SMARTY_DIR}.

    1. Run \`cd "${SMARTY_DIR}" && npm audit\` and capture output.
    2. Check if there are any known vulnerabilities.
    3. If \`npm audit\` produces too much noise, run \`npm audit --audit-level=high\` instead.
    4. Also check if there are outdated major-version packages: \`npm outdated\`.
    5. Check package.json for pinned vs. ranged versions (^ or ~).

    Key packages to verify:
    - next: ^16.2.9 — check for known Next.js vulnerabilities
    - next-auth: beta (v5.0.0-beta.31)
    - prisma / @prisma/client: ^7.8.0
    - stripe: ^22.3.0
    - ioredis: ^5.11.1
    - @trpc/*: ^11.18.0

    Output:
    - Summary of vulnerabilities (counts by severity)
    - Any CRITICAL/HIGH vulnerabilities with package name, patched version
    - Recommendations for updates`,

    onOutput: (output) => {
      if (output.includes('CRITICAL') || output.includes('HIGH')) {
        log('Dependency audit: Critical or high vulnerabilities found.');
      } else {
        log('Dependency audit: No critical vulnerabilities.');
      }
    },
  }),

  agent('Preview mode integrity', {
    instructions: `You are verifying the Preview Mode integrity for the Smarty project at ${SMARTY_DIR}.

    The project has a PREVIEW_MODE feature that mocks external services. Check that:

    1. Read \`src/server/preview-mode.ts\` — does it check \`process.env.PREVIEW_MODE || process.env.NEXT_PUBLIC_PREVIEW_MODE\`?
    2. Read \`src/server/preview-services.ts\` — are ALL mocked services present (Stripe, Sameday, S3/email)?
    3. Search for any external API call that doesn't have a preview guard:
       \`grep -rn "stripe." src/server/ --include="*.ts" | grep -v "preview"\`
    4. Check that preview mode cannot be accidentally enabled in production:
       - Is \`PREVIEW_MODE\` in the Vercel environment variables? It should NOT be.
       - Is there a guard like \`if (process.env.VERCEL && process.env.PREVIEW_MODE)\` to reject it?

    Output:
    - PASS/FAIL for each check
    - Any gaps found
    - Recommendation: is the preview mode safe for production?`,

    onOutput: (output) => {
      if (output.includes('FAIL')) {
        log('Preview mode check: Issues found — review before prod deploy.');
      } else {
        log('Preview mode check: PASSED.');
      }
    },
  })
);

log('Phase complete: Audit done.');

// ---------------------------------------------------------------------------
// Phase 4 — Documentation update
// ---------------------------------------------------------------------------
phase('Docs');

log('Updating deployment documentation...');

const docsResult = await agent('Update deployment docs', {
  instructions: `You are updating deployment documentation for the Smarty project at ${SMARTY_DIR}.

  1. Read the current CHANGELOG.md if it exists (${SMARTY_DIR}/CHANGELOG.md or similar).
  2. Read the current README.md.
  3. Check if there's a docs/ directory (${SMARTY_DIR}/docs/) and list its contents.
  4. Check git log for recent commits (last 10): \`cd "${SMARTY_DIR}" && git log --oneline -10\`.
  5. Check if there's a Vercel deployment config: ${SMARTY_DIR}/vercel.json.

  Based on this information:

  1. **If CHANGELOG exists**: Append a new entry for this deployment with:
     - Date: today's date (2026-07-07)
     - A section titled "## [Unreleased]" or "## [Deploy YYYY-MM-DD]"
     - Recent commit messages grouped by type (Features, Fixes, Refactors, Chores)

  2. **If CHANGELOG does NOT exist**: Create one with the recent commits as the first entries.

  3. **Deployment checklist**: Output a formatted checklist that the developer can verify:
     \`\`\`
     ## Pre-Deploy Checklist
     - [ ] Build passes (\`npm run build\`)
     - [ ] Environment variables set in Vercel dashboard
     - [ ] Database migrations applied (\`npx prisma migrate deploy\`)
     - [ ] Preview mode disabled in production
     - [ ] Tests pass
     - [ ] CHANGELOG updated
     \`\`\`

  4. If a docs/ directory exists with deployment notes, update them with the new deployment info.

  Output: a summary of what was created/updated and the deployment checklist.`,

  onOutput: (output) => log('Documentation updated: ' + output.split('\n').slice(0, 3).join(' | ')),
});

log('Pre-deploy check workflow complete.');
log('Recommendation: Review the outputs above. If all checks pass, deploy via Vercel.');
