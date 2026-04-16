---
name: deploy-vercel
description: >-
  Deploy ComplianceForge to Vercel using the Vercel CLI. Use when the user asks to deploy,
  ship to production, publish a preview, set env vars, domains, or rollback.
---

# Deploy ComplianceForge (Next.js) to Vercel

## Prerequisites

- Vercel CLI: `npm install -g vercel` or `npx vercel`
- Authenticated: `vercel login`
- Valid `package.json` with `build` and `start`
- Prisma schema and `DATABASE_URL` configured in Vercel env

## Production deploy

```bash
vercel --prod --yes
```

First run may create `.vercel/` (gitignored). Use `--yes` to accept detected framework settings.

### Non-interactive: team / scope required

If the CLI errors with `missing_scope` or `action_required`, pass your team scope:

```bash
vercel --prod --yes --scope <your-team-slug>
```

Or link once, then deploy without `--scope`:

```bash
vercel link --yes --scope <your-team-slug>
vercel --prod --yes
```

## Preview deploy

```bash
vercel --yes
```

## Environment variables

```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env ls
vercel env pull .env.local
```

### Required env vars for ComplianceForge

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection (pooled) |
| `DIRECT_URL` | Neon PostgreSQL connection (direct, for migrations) |
| `NEXTAUTH_SECRET` | NextAuth session encryption |
| `NEXTAUTH_URL` | Canonical app URL |
| `GITHUB_APP_ID` | GitHub App for CI/CD integration |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key |

## Build command

The build runs `prisma generate && next build` (defined in `package.json`). Ensure Prisma schema is committed and `DATABASE_URL` is set in Vercel.

## Post-deploy checks

- Open the production URL; confirm `/` shows the landing page
- Test `/sign-in` and `/dashboard` for auth flow
- Optional smoke E2E against the live URL:

```powershell
$env:BASE_URL="https://your-deployment.vercel.app"
npx playwright test
```

(`playwright.config.ts` skips starting a local server when `BASE_URL` is set.)

## Rollback & logs

```bash
vercel rollback
vercel inspect <deployment-url> --logs
```

## Notes

- Framework is auto-detected; no `output: "standalone"` required
- Ensure Node version matches local if builds differ: `engines` in `package.json` if needed
- The `.vercelignore` file excludes test artifacts and docs from deploy
