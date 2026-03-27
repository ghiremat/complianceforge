---
name: docs-feature-updater
description: >-
  Audit and update ComplianceForge documentation and feature design docs against the actual
  codebase. Use when updating the feature roadmap, adding new features, auditing feature
  status, syncing docs with code changes, or when the user mentions docs, features,
  roadmap, architecture, or documentation updates.
---

# ComplianceForge Docs & Feature Updater

## Documentation Map

```
docs/
├── FEATURE-ROADMAP.md            → Master roadmap with priority ranking, readiness tiers, stack corrections
├── ARCHITECTURE.md               → System architecture diagrams and design decisions
├── SKILLS-INVENTORY.md           → Full skills inventory and integration mapping
└── features/
    ├── 01-cicd-integration.md    → Feature design docs (numbered by priority)
    ├── 02-compliance-as-code-sdk.md
    ├── ...
    └── NN-feature-name.md
```

## Feature Doc Standard Structure

Every feature doc in `docs/features/` must include these sections in order:

```markdown
# Feature: [Name]

**Priority:** N
**Analogy:** "[Known product] for [domain]"
**Status:** [See Status Values below]

## The Pitch
## Why It's YC-Worthy
## Key Capabilities
## Existing Foundation
## Codebase Audit          ← What exists vs what needs building
## Technical Specifications ← Concrete implementation using actual stack
## Implementation Approach  ← Phased plan with T-shirt effort sizes (S/M/L/XL)
## Technical Debt / Corrections ← Discrepancies between docs and code
## Revenue Impact
```

### Status Values

| Status | Meaning |
|--------|---------|
| `Planned — Foundation Ready` | Core libs/models exist, feature needs wiring |
| `Backend Ready` | API/data layer shipped, needs client-side work |
| `Early Foundation` | Pattern exists but major new development needed |
| `Proposed` | Design only, no implementation |
| `Not Started` | No code exists |
| `In Progress` | Active development |
| `Shipped` | Deployed and tested |

### Effort Sizes

| Size | Meaning |
|------|---------|
| S | < 1 week, one person |
| M | 1–2 weeks |
| L | 2–4 weeks |
| XL | 1–2 months, multi-person |
| XXL | 2+ months, infrastructure work |

## Audit Workflow

When updating docs after code changes, follow this process:

### Step 1: Discover what changed

```
1. Read the feature doc being updated
2. Search the codebase for relevant files:
   - Prisma schema (prisma/schema.prisma) for new models
   - API routes (src/app/api/) for new endpoints
   - Lib files (src/lib/) for new business logic
   - Pages (src/app/) for new UI
   - E2E tests (e2e/) for test coverage
3. Compare what the doc claims vs what code exists
```

### Step 2: Update the feature doc

```
1. Update Status to reflect current reality
2. Update "Existing Foundation" with verified file paths and capabilities
3. Update "Codebase Audit" table: what exists | what's missing
4. Update "Technical Specifications" with actual stack details
5. Add/update effort estimates on Implementation phases
6. Update "Technical Debt / Corrections" for any doc-vs-code drift
```

### Step 3: Sync the roadmap

After updating individual feature docs, sync `docs/FEATURE-ROADMAP.md`:

```
1. Update the Priority Ranking table (Status + Effort columns)
2. Update the Readiness Assessment tiers (move features between tiers if status changed)
3. Update "Existing Foundations (Audited)" table
4. Update "Technical Stack Corrections" if new dependencies were added/removed
5. Set "Last audited against codebase" date to today
```

## Actual Tech Stack (use these, not aspirational claims)

| Layer | Actual Implementation |
|-------|----------------------|
| Framework | Next.js 15 App Router |
| API | Server actions (`src/server/actions.ts`) + API route handlers |
| Database | Prisma ORM + PostgreSQL (Neon) |
| Auth | NextAuth v4 + custom `cf_auth` HMAC cookie |
| AI | Anthropic Claude SDK (`src/lib/claude.ts`) |
| Email | AgentMail (`src/lib/email.ts`) |
| Payments | Stripe (`src/lib/stripe.ts`) |
| Scanning | Octokit (`src/lib/github-scanner.ts`) |
| Rate Limiting | lru-cache (in-process, NOT Redis) |
| Validation | Zod schemas (`src/types/index.ts`) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest (unit) + Playwright (E2E) |

**NOT in codebase** (despite some docs claiming otherwise):
tRPC, Clerk, Redis/Upstash, BullMQ, TipTap, React Flow, pgvector

## Key Prisma Models Reference

```
Organization, User, Account, Session, VerificationToken,
AiSystem, Assessment, Document, Incident, AuditLog,
ScanResult, ComplianceDeadline, ConformityAssessment,
ApiKey, Invitation,
GitHubInstallation, CiCheckRun,        ← CI/CD feature
PassportConfig, PassportAccessLog,      ← Passport feature
AiBom, AiBomComponent                   ← AI-BOM feature
```

## Adding a New Feature

When creating a new feature doc:

1. Determine the next priority number (check existing docs in `docs/features/`)
2. Create `docs/features/NN-feature-name.md` following the standard structure above
3. Include all required sections — especially Codebase Audit and Technical Specifications
4. Add the feature to the Priority Ranking table in `FEATURE-ROADMAP.md`
5. Place it in the correct Readiness Assessment tier
6. Add to the "Existing Foundations" table

## Parallel Audit Pattern

For bulk updates across all features, use parallel agents:

```
1. Read all feature docs + codebase context first
2. Launch one agent per feature doc with:
   - The feature doc content
   - Relevant codebase file paths and contents
   - Instructions to update all audit sections
3. After all agents complete, sync FEATURE-ROADMAP.md
```

## Rules

1. Never overstate readiness — if code doesn't exist, say "Not Started"
2. Always cite actual file paths (`src/lib/foo.ts`) not aspirational ones
3. Keep the roadmap date (`Last audited against codebase`) current
4. Feature docs should remain strategic — don't remove pitch/YC/revenue sections
5. T-shirt sizes must reflect honest effort, not optimistic estimates
6. When stack corrections change (e.g., a dependency is actually added), update both the feature doc AND the roadmap's Technical Stack Corrections table
7. New Prisma models go in the Key Models Reference above
