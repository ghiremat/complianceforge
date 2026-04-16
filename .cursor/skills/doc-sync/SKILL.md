---
name: doc-sync
description: >-
  Keep ComplianceForge documentation in sync with code. Use when code changes
  (new API routes, Prisma models, components, config, dependencies) or when
  the user asks to update, regenerate, or sync documentation.
---

# Doc Sync — ComplianceForge Living Documentation

## When to Trigger

Run doc sync **automatically** whenever:
- A Prisma model is added, changed, or removed
- API endpoints in `src/app/api/` change (new routes, params)
- New pages or components are added to `src/app/` or `src/components/`
- `package.json` or `prisma/schema.prisma` change
- New environment variables are introduced
- The user says "sync docs", "update docs", or "regenerate docs"

## Documentation Map

```
docs/
├── FEATURE-ROADMAP.md         → Master roadmap with priority ranking
├── ARCHITECTURE.md            → System architecture and design decisions
├── SKILLS-INVENTORY.md        → Skills inventory and integration mapping
├── UI-UX-IMPROVEMENT-PLAN.md  → UI/UX improvement plan
└── features/
    ├── 01-cicd-integration.md
    ├── 02-compliance-as-code-sdk.md
    ├── 03-multi-regulation-graph.md
    ├── 04-compliance-passport.md
    ├── 05-automated-evidence-collection.md
    ├── 06-live-model-monitoring.md
    ├── 07-ai-supply-chain-bom.md
    └── 08-compliance-copilot.md
```

## Sync Process

### Step 1: Discover what changed

1. Check `git diff --name-only` for modified files
2. Scan `prisma/schema.prisma` for new/changed models
3. Scan `src/app/api/` for new/changed API routes
4. Scan `src/components/` for new components
5. Check `package.json` for new dependencies

### Step 2: Update affected docs

1. Update feature docs status to reflect reality
2. Update "Existing Foundation" with verified file paths
3. Update "Codebase Audit" table: what exists vs what's missing
4. Add new features to `FEATURE-ROADMAP.md` if applicable
5. Update `ARCHITECTURE.md` if structure changes

### Step 3: Sync the roadmap

After individual updates, sync `docs/FEATURE-ROADMAP.md`:
1. Update Priority Ranking table (Status + Effort columns)
2. Update Readiness Assessment tiers
3. Set "Last audited against codebase" date to today

## Rules

- **Never overstate readiness** — if code doesn't exist, say "Not Started"
- **Always cite actual file paths** (`lib/policy-engine.ts`) not aspirational ones
- **Keep the roadmap date current**
- **Feature docs should remain strategic** — keep pitch/YC/revenue sections
- **Honest effort estimates** — use T-shirt sizes (S/M/L/XL/XXL)

## Actual Tech Stack (reference)

| Layer | Implementation |
|-------|---------------|
| Framework | Next.js 14.2.5 App Router |
| Database | Prisma ORM + PostgreSQL (Neon) |
| Auth | NextAuth v5 beta |
| UI | shadcn/ui + Radix + Tailwind CSS 3.4 |
| Icons | Lucide React |
| Charts | Recharts |
| Scanning | Octokit (`lib/github-scanner.ts`) |
| Scoring | Custom (`lib/compliance-scoring.ts`) |
| Policy | Custom (`lib/policy-engine.ts`) |
| AI-BOM | Custom (`lib/ai-bom.ts`) |

## Prisma Models

```
Organization, User, Account, Session, VerificationToken,
AiSystem, Assessment, Document, Incident, AuditLog,
ScanResult, ComplianceDeadline, ConformityAssessment,
ApiKey, Invitation,
GitHubInstallation, CiCheckRun,
PassportConfig, PassportAccessLog,
AiBom, AiBomComponent
```
