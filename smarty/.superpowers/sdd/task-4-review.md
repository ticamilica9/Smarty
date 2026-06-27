# Task 4 Review: Authentication

**Commit range:** `29f182a` (base, tRPC setup) .. `19cba21` (auth implementation)
**Reviewed files:** `src/server/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/inregistrare/page.tsx`, `src/app/(auth)/inregistrare/register-form.tsx`, `src/middleware.ts`, `src/components/ui/label.tsx`, `package.json`

**Note:** The source files specified for this review (`.superpowers/sdd/task-4-brief.md`, `.superpowers/sdd/task-4-report.md`, `review-29f182a..19cba21.diff`) do not exist in the working tree or git history. The review was conducted against the current state of the codebase (commit `19cba21`). Spec compliance criteria were inferred from the task description in the review prompt.

---

## Verdict 1: Spec Compliance

All six spec criteria are satisfied.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `auth.ts` has Google + Email providers with PrismaAdapter | **PASS** | `src/server/auth.ts` imports `GoogleProvider`, `EmailProvider`, and `PrismaAdapter`. Adapter is wired as `adapter: PrismaAdapter(prisma)`, both providers are configured in the `providers` array. |
| 2 | API route exports GET/POST handlers | **PASS** | `src/app/api/auth/[...nextauth]/route.ts` imports `handlers` from `@/server/auth` and re-exports `{ GET, POST }`. |
| 3 | Login page at `(auth)/login` with email + Google sign-in | **PASS** | `src/app/(auth)/login/page.tsx` renders `LoginForm` which provides both an email input form (calls `signIn('email', ...)`) and a Google sign-in button (calls `signIn('google', ...)`). |
| 4 | Register page at `(auth)/inregistrare` with name/email form | **PASS** | `src/app/(auth)/inregistrare/page.tsx` renders `RegisterForm` with both `name` and `email` `<Input>` fields, both marked `required`. |
| 5 | `middleware.ts` protects `/cont/:path*` and `/admin/:path*` | **PASS** | `src/middleware.ts` exports `auth as middleware` with `matcher: ['/cont/:path*', '/admin/:path*']`. |
| 6 | Session includes `user.id` and `user.role` | **PASS** | Session callback assigns `user.id` and `user.role` (defaulting to `'USER'`) to `session.user`. Module augmentation declares both fields. |

---

## Verdict 2: Task Quality

### GRADE: B (Satisfactory with notable issues)

The implementation is functional for the core auth flow but has several quality concerns -- some production-blocking.

### Critical Issues

**1. Register form collects `name` but discards it (data loss)**
The register form (`register-form.tsx`) maintains `name` in local state with `useState({ name: '', email: '' })` and renders it as a required input field. However, on submit it only calls `signIn('email', { email: form.email, callbackUrl: '/' })`, never sending the `name` value anywhere. NextAuth v5 EmailProvider's magic-link flow has no standard mechanism to capture a user-supplied name. The field is therefore decorative -- users who type their name receive no benefit and may be misled into thinking their name has been captured.

**2. Google provider instantiated unconditionally with potentially empty credentials (runtime crash)**
`GoogleProvider` is always created with `process.env.AUTH_GOOGLE_ID!` and `process.env.AUTH_GOOGLE_SECRET!` (non-null assertion). In `.env`, both values are `""` (empty string). The Email provider is conditional on `EMAIL_SERVER` being set, but Google is not. At runtime this will throw because NextAuth validates non-empty provider credentials. The Google provider should either be conditionally enabled (like Email) or the env vars must be documented as required.

**3. No `SessionProvider` in the component tree**
The root `layout.tsx` wraps children with `TRPCProvider` but has no `<SessionProvider>` from `next-auth/react`. While `signIn()` and `signOut()` from `next-auth/react` can work for redirect-based auth without it, `useSession()` -- the standard way to read session state in client components -- will fail without `SessionProvider`. Any future client component that needs user data will break until this is added.

### Moderate Issues

**4. No error handling in auth forms**
Both `LoginForm` and `RegisterForm` call `await signIn(...)` without try/catch. If the provider is unavailable, network fails, or NextAuth returns an error, the promise rejects silently. The loading spinner returns to its idle state but no error message is shown to the user.

**5. No loading indicator on the Google sign-in button**
The Google button has no loading/disabled state, unlike the email submit button. A user may click it multiple times, triggering multiple redirects or auth requests.

**6. Session callback uses unsafe type assertions**
```typescript
;(session.user as unknown as Record<string, unknown>).id = user.id
```
This bypasses the type system and makes the module augmentation (lines 8-18) partially redundant. The session callback should access `user.id` and `user.role` directly through properly-typed interfaces.

**7. No `authorized` callback in auth config**
The NextAuth config lacks an `authorized` callback. The middleware will block unauthenticated requests to `/cont/*` and `/admin/*` and redirect them to the sign-in page, but there is no role-gating at the auth level. Any authenticated user can access `/admin/*` regardless of role. An `authorized` callback checking `token.role === 'ADMIN'` for the `/admin/*` path is needed.

### Minor Issues

**8. Scope leak: `@trpc/react-query` added in auth commit**
The dependency `@trpc/react-query` (already listed in `package.json` from task 3) was re-added as part of this commit diff. This suggests a `npm install` was run without the `--save` flag from a clean state, or a merge/rebase artifact. Should have been part of task 3, not task 4.

**9. Environment configuration gaps**
- `AUTH_SECRET` in `.env` is set to a placeholder string `"generate-with-openssl-rand-base64-32"` rather than an actual secret.
- No `.env.example` update to document `EMAIL_SERVER` and `EMAIL_FROM` as required variables.
- No `AUTH_TRUST_HOST` variable (needed in production behind proxies with NextAuth v5).

**10. Missing `type="button"` on Google button**
The Google `<Button>` inside `LoginForm` is rendered outside the `<form>` element, so it does not accidentally submit the form. However, it lacks an explicit `type="button"` attribute. If a future layout change nests it inside a form, it would unexpectedly submit.

---

## Summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| Spec compliance | 6/6 | All six criteria met |
| Correctness | 3/5 | Discarded name field, missing SessionProvider, no error handling |
| Robustness | 3/5 | Unconditional Google provider, no authorized callback, empty env vars |
| UX | 3/5 | Name field is misleading, no error messages, Google btn has no loading state |
| Code quality | 3/5 | Type assertions, scope leak, fragile provider gating |

**Overall: The implementation satisfies the spec but has real issues that need addressing before the app can be considered production-ready. Priority fixes: (1) remove or wire up the name field on register, (2) add SessionProvider to root layout, (3) gate Google provider behind env var presence, (4) add authorized callback for role-based admin access.**
