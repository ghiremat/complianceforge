# ComplianceForge Architecture

## System Overview

```
                    ┌─────────────────────────────────┐
                    │          USERS                   │
                    │  Compliance Officers, CTOs,        │
                    │  Legal Teams, Auditors             │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│  GITHUB APP     │     │   NEXT.JS FRONTEND     │     │ PUBLIC VISITORS │
│  (repos / PRs)  │     │  (Vercel Edge — EU)    │     │ (trust pages)   │
└────────┬────────┘     ├────────────────────────┤     └────────┬────────┘
         │              │  Landing Page          │              │
         │              │  Auth (NextAuth v4 +   │              │
         │              │   cf_auth cookie)      │              │
         │              │  Dashboard             │              │
         │              │  AI System Inventory   │              │
         │              │  Risk Classifier UI    │              │
         │              │  Document Editor       │              │
         │              │  Audit Trail / Calendar│              │
         │              │  Settings & Billing    │              │
         │              │  Public: /trust/...    │              │
         │              └───────────┬────────────┘              │
         │                          │                          │
         │         Server Actions + Server Components           │
         │                          │ Route Handlers (JSON)      │
         └──────────────┬───────────┼──────────────────────────┘
                        │           │
                        ▼           ▼
                    ┌───────────────────────────────────┐
                    │         API LAYER                  │
                    │  Next.js Route Handlers          │
                    ├───────────────────────────────────┤
                    │  /api/v1/* … API key (org scope) │
                    │    systems, incidents              │
                    │    /systems/[id]/classify         │
                    │    /systems/[id]/gaps             │
                    │    /systems/[id]/score            │
                    │    /systems/[id]/documents        │
                    │    /systems/[id]/evidence         │
                    │    /systems/[id]/bom (+ /export)  │
                    │    /systems/[id]/passport         │
                    │  /api/github/webhook              │
                    │  /api/github/check-runs/[id]      │
                    │  /api/passport/[systemId]         │
                    │  /api/passport/widget.js          │
                    │  auth, stripe, health, export     │
                    └──┬──────┬──────┬──────┬──────┬────┘
                       │      │      │      │      │
          ┌────────────▼┐ ┌───▼───┐ ┌▼─────┐ ┌▼──────────┐
          │  CLAUDE AI  │ │PRISMA │ │ LRU  │ │ AGENTMAIL │
          │ (Anthropic) │ │(Neon) │ │CACHE │ │ (Email)   │
          ├─────────────┤ ├───────┤ │(proc)│ ├───────────┤
          │Risk Classify│ │AI Sys │ ├──────┤ │Compliance │
          │Doc Generate │ │Assess │ │Rate  │ │ Alerts    │
          │Gap Analysis │ │Docs   │ │limit │ │Incident   │
          │policy-engine│ │Audit  │ │(in-  │ │ Notify    │
          │+ ai-bom     │ │BOM /  │ │proc) │ │Report     │
          │  (CycloneDX)│ │Passport│ └──────┘ │ Delivery  │
          └─────────────┘ │GitHub │          └───────────┘
                          │CI runs│
                          │Users  │
                          │Org +  │
                          │ slug  │
                          └───┬───┘
                              │
                   ┌──────────▼──────────────────────┐
                   │     POSTGRESQL (Neon)            │
                   ├──────────────────────────────────┤
                   │  organizations (+ slug)          │
                   │  users, sessions (NextAuth)      │
                   │  ai_systems                      │
                   │  assessments                     │
                   │  documents                       │
                   │  incidents                       │
                   │  audit_logs (append-only)        │
                   │  compliance_deadlines            │
                   │  github_installations            │
                   │  ci_check_runs                   │
                   │  passport_config                 │
                   │  passport_access_logs            │
                   │  ai_boms, ai_bom_components      │
                   └──────────────────────────────────┘
```

## CI/CD, public trust, and AI-BOM

| Surface | Role |
|---------|------|
| **CI/CD** | GitHub App posts to `api/github/webhook`; `src/lib/policy-engine.ts` parses YAML policy and evaluates compliance; check runs stored in `CiCheckRun`, installations in `GitHubInstallation`. |
| **Public trust** | `(public)` layout and `/trust/[orgSlug]/[systemId]` for read-only passport pages; `api/passport/*` serves widget JSON and embeddable `widget.js` (no session auth). |
| **AI-BOM** | `src/lib/ai-bom.ts` builds BOMs and CycloneDX export; persisted as `AiBom` / `AiBomComponent`; REST under `/api/v1/systems/[id]/bom` and `/export`. |

## Data Flow: Risk Classification

```
1. User adds AI system to inventory
   └→ Server Action (or authenticated UI flow)
      └→ Prisma: INSERT ai_systems
      └→ Prisma: INSERT audit_logs

2. User requests risk classification
   └→ Server Action / internal service
      └→ Claude API: classifyRiskTier(systemMetadata)
         └→ Returns: { riskTier, confidence, justification, ... }
      └→ Prisma: INSERT assessments
      └→ Prisma: UPDATE ai_systems SET risk_tier
      └→ Prisma: INSERT audit_logs
      └→ AgentMail: Send classification notification (if configured)

3. System generates Annex IV documentation
   └→ Server Action / document pipeline
      └→ Claude API: generateDocumentSection() × sections
      └→ Prisma: INSERT documents (per section)
      └→ Prisma: INSERT audit_logs
      └→ AgentMail: Send report ready notification
```

## Data Flow: External integrations (summary)

```
GitHub push / PR
   └→ POST /api/github/webhook
      └→ policy-engine: load policy YAML, evaluate repo / manifest signals
      └→ Prisma: upsert GitHubInstallation, create/update CiCheckRun

API consumers (SDK / automation)
   └→ GET|POST /api/v1/systems/... (Bearer API key)
      └→ gaps, score, documents, evidence, bom, passport config

Embeddable passport
   └→ GET /api/passport/[systemId]  (public JSON)
   └→ GET /api/passport/widget.js   (script for third-party sites)
```

## Security Architecture

```
┌──────────────────────────────────────────────────┐
│                 SECURITY LAYERS                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  1. NETWORK                                       │
│     ├─ HTTPS enforced (TLS 1.3)                  │
│     ├─ CSP headers                               │
│     ├─ CORS restricted to app domain             │
│     └─ Rate limiting (lru-cache, in-process)    │
│                                                   │
│  2. AUTHENTICATION                                │
│     ├─ NextAuth v4 (Google / GitHub OAuth)      │
│     ├─ Custom signed cf_auth cookie (HMAC)       │
│     └─ Database sessions (Prisma adapter)        │
│                                                   │
│  3. AUTHORIZATION                                 │
│     ├─ RBAC: Admin > CO > Auditor > Viewer       │
│     ├─ Organization-scoped data isolation         │
│     ├─ Public routes: passport trust + widget    │
│     │   (no login; visibility gated in config)    │
│     └─ Feature gating by subscription plan        │
│                                                   │
│  4. DATA PROTECTION                               │
│     ├─ PII encrypted at rest (AES-256)           │
│     ├─ Parameterized queries (Prisma)            │
│     ├─ Input validation (Zod schemas)            │
│     └─ EU-region hosting (GDPR)                  │
│                                                   │
│  5. AUDIT                                         │
│     ├─ Append-only audit logs                    │
│     ├─ 10-year retention (Art. 12)               │
│     ├─ Tamper-evident logging                    │
│     └─ All AI API calls logged                   │
│                                                   │
└──────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                    VERCEL (EU)                    │
│  ┌─────────────┐  ┌────────────┐                │
│  │ Next.js SSR  │  │ Edge       │                │
│  │ + API Routes │  │ Middleware │                │
│  └──────┬──────┘  └─────┬──────┘                │
│         │                │                        │
│  ┌──────▼────────────────▼──────┐                │
│  │        Serverless Functions    │                │
│  │  (Route handlers, Claude API)  │                │
│  └───────────────┬───────────────┘                │
└──────────────────┼───────────────────────────────┘
                   │
     ┌─────────────┼────────────────────┐
     │             │                    │
┌────▼────┐  ┌────▼─────┐  ┌──────────▼──┐
│  Neon   │  │ In-proc  │  │  Anthropic  │
│ Postgres│  │ LRU cache│  │  Claude API │
│  (EU)   │  │ (limits) │  │             │
└─────────┘  └──────────┘  └────────────┘
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 15 App Router | SSR for SEO, server components for performance, API routes colocation |
| Mutations & server logic | Server Actions + Route Handlers | First-class App Router pattern; JSON APIs for integrations without tRPC |
| Database | Neon PostgreSQL | Serverless, EU regions, branching for dev/staging |
| ORM | Prisma | Type-safe queries, migration management, schema-first |
| AI | Claude claude-sonnet-4-20250514 | Best reasoning for legal/compliance classification, structured output |
| Auth | NextAuth v4 + `cf_auth` cookie | OAuth providers + Prisma adapter; HMAC cookie for lightweight request checks |
| Email | AgentMail | API-first, SOC2 certified, attachment support |
| Hosting | Vercel EU | Edge network, EU data residency, zero-config deployment |
| Rate limiting / hot cache | lru-cache (in-process) | No Redis dependency per instance; suitable for serverless limits |

## E2E coverage (Playwright)

| Spec | Focus |
|------|--------|
| `e2e/cicd-integration.spec.ts` | GitHub webhook / check-run flows |
| `e2e/sdk-api.spec.ts` | Public v1 API with API keys |
| `e2e/passport.spec.ts` | Public trust page and passport APIs |
| `e2e/ai-bom.spec.ts` | BOM CRUD and export |

## Key source files (reference)

| Area | Path |
|------|------|
| Policy + CI evaluation | `src/lib/policy-engine.ts` |
| AI-BOM + CycloneDX | `src/lib/ai-bom.ts` |
| GitHub webhook | `src/app/api/github/webhook/route.ts` |
| Check run detail | `src/app/api/github/check-runs/[id]/route.ts` |
| v1 system extensions | `src/app/api/v1/systems/[id]/gaps/route.ts`, `.../score/`, `.../documents/`, `.../evidence/`, `.../bom/`, `.../bom/export/`, `.../passport/` |
| Public layout | `src/app/(public)/layout.tsx` |
| Trust page | `src/app/(public)/trust/[orgSlug]/[systemId]/page.tsx` |
| Passport JSON / widget | `src/app/api/passport/[systemId]/route.ts`, `src/app/api/passport/widget.js/route.ts` |
