---
name: playwright-e2e
description: >-
  Run and extend Playwright E2E tests for ComplianceForge. Use when fixing flaky tests, adding flows,
  or running tests against a deployed URL via BASE_URL. Covers auth helpers and webServer config.
---

# Playwright E2E (ComplianceForge)

## Current state

- **4 spec files** in `e2e/` covering CI/CD integration, AI-BOM, Passport, and SDK API
- Tests run against Next.js dev server or deployed URL
- Auth uses NextAuth v5 with bcrypt-hashed passwords in PostgreSQL (Neon)

## Commands

```bash
npx playwright test              # Run all tests
npx playwright test --ui         # Interactive UI mode
$env:BASE_URL="https://complianceforge.vercel.app"; npx playwright test  # Against deployed URL
```

Install browsers if needed: `npx playwright install chromium`

## Config (`playwright.config.ts`)

- **Tests:** `e2e/`
- **baseURL:** `process.env.BASE_URL` or `http://127.0.0.1:3000`
- **Local server:** If `BASE_URL` is **unset**, Playwright runs `npm run dev` and waits for `http://127.0.0.1:3000`
- **Deployed / staging:** Set `BASE_URL` so **no** local `webServer` is started:

```powershell
$env:BASE_URL="https://complianceforge.vercel.app"; npx playwright test
```

## Auth helper pattern

- Login helper fills the sign-in form with test credentials and waits for redirect to `/dashboard`
- Uses email + password only — no hardcoded IDs or localStorage injection
- Default test password must match seeded users in Prisma

## Test files

| File | What it covers |
|------|----------------|
| `ai-bom.spec.ts` | AI Bill of Materials feature flows |
| `cicd-integration.spec.ts` | CI/CD GitHub integration feature flows |
| `passport.spec.ts` | Compliance Passport public trust pages |
| `sdk-api.spec.ts` | SDK API endpoint validation |

## Writing tests

- **Auth:** Always call the login helper in `beforeEach` or at test start
- **Timeouts:** Use generous timeouts (15-20s) for page loads — Neon cold starts add latency
- **Assertions:** Prefer flexible regexes over exact text matches for demo data
- **Data:** Tests should work with seeded Prisma data. Avoid asserting on specific UUIDs
- **Selectors:** Prefer `data-testid`, `role=`, and `text=` selectors over CSS classes

## Adding a new E2E test

```
1. Create e2e/feature-name.spec.ts
2. Import test helpers (login, navigation)
3. Add beforeEach with loginAs(page, role)
4. Test the happy path first, then edge cases
5. Run: npx playwright test feature-name
6. Verify in CI before merging
```

## Troubleshooting

| Issue | Approach |
|--------|-----------|
| `webServer` timeout | Start dev manually: `npm run dev`, then run tests with `$env:BASE_URL="http://127.0.0.1:3000"` |
| Wrong host | Config uses `127.0.0.1`, not `localhost`, for consistency on Windows |
| Login timeout | Neon cold start can make login slow; increase `waitForURL` timeout |
| Port in use | Kill existing process: `netstat -ano | findstr ":3000"` then `taskkill /PID <pid> /F` |

## Stack context

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 App Router |
| Auth | NextAuth v5 (beta) |
| Database | Prisma + PostgreSQL (Neon) |
| UI Components | shadcn/ui (Radix) |
| Icons | Lucide React |
