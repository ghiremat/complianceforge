---
name: full-stack-sync
description: >-
  Keep ComplianceForge features, code, database, tests, and documentation in sync.
  Use when adding features, changing Prisma schemas, modifying API routes,
  or any change that touches multiple layers of the stack.
---

# Full-Stack Sync — ComplianceForge

## When to use this skill

Invoke when any of these happen:

- Adding a new feature (new Prisma model, API route, page, or component)
- Changing the Prisma schema (migration)
- Adding or changing API routes
- Updating seed data
- Fixing bugs that span multiple layers

## The sync checklist

Every feature or change must keep **7 layers** in sync.

### 1. Prisma schema (`prisma/schema.prisma`)

- Add model with proper relations
- Run: `npx prisma db push` (dev) or `npx prisma migrate dev` (production)
- Run: `npx prisma generate`

### 2. TypeScript types (`types/index.ts`)

- Add or update interfaces matching the Prisma model shape
- Export for use across the codebase

### 3. API route (`src/app/api/.../route.ts`)

- Follow REST conventions: GET for reads, POST for mutations
- Add auth check via NextAuth `getServerSession` or API key validation
- Return shapes: `{ data }` for reads, created object for mutations

### 4. Library functions (`lib/`)

- Business logic in `lib/` — e.g., `lib/compliance-scoring.ts`, `lib/policy-engine.ts`
- Keep framework-agnostic where possible
- Import Prisma client from `server/db.ts`

### 5. UI component / page

- Custom components in `src/components/`
- shadcn/ui primitives in `src/components/ui/`
- Pages in `src/app/` following App Router conventions
- Use `"use client"` only when needed (state, effects, event handlers)

### 6. E2E tests (`e2e/`)

- Add spec for new page/flow
- Follow existing pattern from `e2e/*.spec.ts`

### 7. Documentation (`docs/`)

- Update feature doc in `docs/features/`
- Sync `docs/FEATURE-ROADMAP.md` status
- Update `docs/ARCHITECTURE.md` if structure changes

## Quick-reference: adding a new entity

```
1. prisma/schema.prisma              Add model with relations
2. npx prisma db push                Push schema to database
3. types/index.ts                    Add TypeScript interface
4. lib/new-entity.ts                 Add business logic (if needed)
5. src/app/api/entities/route.ts     GET + POST handlers
6. src/components/entity-card.tsx    UI component
7. src/app/dashboard/page.tsx        Wire into dashboard (or new page)
8. e2e/entity.spec.ts               E2E test
9. docs/features/NN-entity.md       Feature documentation
```

## Verification commands

```bash
npx prisma validate            # Schema is valid
npx prisma generate            # Client matches schema
npm run build                  # TypeScript compiles, Next.js builds
npx playwright test            # E2E tests pass
```

## Prisma models reference

```
Organization, User, Account, Session, VerificationToken,
AiSystem, Assessment, Document, Incident, AuditLog,
ScanResult, ComplianceDeadline, ConformityAssessment,
ApiKey, Invitation,
GitHubInstallation, CiCheckRun,        ← CI/CD feature
PassportConfig, PassportAccessLog,     ← Passport feature
AiBom, AiBomComponent                  ← AI-BOM feature
```

## Common pitfalls

| Pitfall | Prevention |
|---------|------------|
| Schema out of sync with types | Run `prisma generate` then update `types/index.ts` |
| API route missing auth | Add `getServerSession` or API key check |
| Component uses server-only code | Split into server component + client component |
| Missing `"use client"` | Add when using useState, useEffect, onClick |
| E2E test uses hardcoded data | Use flexible selectors and regex assertions |
| Docs claim features that don't exist | Audit `docs/features/` against actual code |
