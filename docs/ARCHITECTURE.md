# ComplianceForge Architecture

## System Overview

```
                    ┌─────────────────────────────────┐
                    │          USERS                   │
                    │  Compliance Officers, CTOs,      │
                    │  Legal Teams, Auditors           │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│  GITHUB APP     │     │   NEXT.JS FRONTEND    │     │ PUBLIC VISITORS │
│  (repos / PRs)  │     │  (Vercel — EU)        │     │ (trust pages)   │
└────────┬────────┘     ├────────────────────────┤     └────────┬────────┘
         │              │  Landing Page          │              │
         │              │  Auth (NextAuth v5     │              │
         │              │   Credentials + JWT)   │              │
         │              │  Dashboard             │              │
         │              │  AI System Inventory   │              │
         │              │  Risk Classifier UI    │              │
         │              │  Document Editor       │              │
         │              │  Incidents / Deadlines │              │
         │              │  Audit log / Team /    │              │
         │              │  API keys / Settings   │              │
         │              │  Public: /trust/...    │              │
         │              └───────────┬────────────┘              │
         │                          │                          │
         │         Route Handlers (JSON) + client components     │
         └──────────────┬───────────┼──────────────────────────┘
                        │           │
                        ▼           ▼
                    ┌───────────────────────────────────┐
                    │         API LAYER                  │
                    │  Next.js Route Handlers            │
                    ├───────────────────────────────────┤
                    │  /api/v1/* … API key (org scope)   │
                    │    systems, incidents, gaps, …     │
                    │  /api/github/webhook               │
                    │  /api/github/check-runs/[id]       │
                    │  /api/passport/[systemId]          │
                    │  /api/passport/widget.js           │
                    │  /api/systems, /api/scan, …        │
                    │  /api/team, /api/api-keys, …       │
                    │  /api/audit-logs, /api/deadlines   │
                    │  auth, health, export patterns     │
                    └──┬──────┬──────┬──────┬──────┬────┘
                       │      │      │      │      │
          ┌────────────▼┐ ┌───▼───┐ ┌▼─────┐ ┌▼──────────┐
          │ OPENROUTER  │ │PRISMA │ │ LRU  │ │  EMAIL    │
          │(NVIDIA LLM) │ │(Neon) │ │CACHE │ │ (planned) │
          ├─────────────┤ ├───────┤ │(proc)│ ├───────────┤
          │Risk Classify│ │AI Sys │ ├──────┤ │Notify,    │
          │Doc Generate │ │Assess │ │Rate  │ │invites    │
          │Gap Analysis │ │Docs   │ │limit │ │(future)   │
          │policy-engine│ │Audit  │ │      │ │           │
          │+ ai-bom     │ │BOM /  │ └──────┘ └───────────┘
          │  (CycloneDX)│ │Passport│
          └─────────────┘ │GitHub │
                          │CI runs│
                          │Users  │
                          │Org +  │
                          │invites│
                          └───┬───┘
                              │
                   ┌──────────▼──────────────────────┐
                   │     POSTGRESQL (Neon)            │
                   ├──────────────────────────────────┤
                   │  organizations (+ slug, Stripe   │
                   │    IDs scaffolded, unused)       │
                   │  users, sessions (NextAuth)       │
                   │  invitations                      │
                   │  api_keys                         │
                   │  ai_systems                       │
                   │  assessments, documents           │
                   │  incidents                        │
                   │  audit_logs (append-only)         │
                   │  compliance_deadlines             │
                   │  github_installations             │
                   │  ci_check_runs                    │
                   │  passport_config / access_logs    │
                   │  ai_boms, ai_bom_components       │
                   └──────────────────────────────────┘
```

## Product surfaces (dashboard)

Working areas in the authenticated app include: **Command Center**, **AI Inventory**, **GitHub Scanner**, **Compliance Tracker**, **Incidents**, **Deadlines**, **Audit log viewer**, **Reports**, **Team management** (invitations and roles), **API key management** with **organization settings**, and **user settings**.

## CI/CD, public trust, and AI-BOM

| Surface | Role |
|---------|------|
| **CI/CD** | GitHub App posts to `api/github/webhook`; `src/lib/policy-engine.ts` parses YAML policy and evaluates compliance; check runs stored in `CiCheckRun`, installations in `GitHubInstallation`. |
| **Public trust** | `(public)` layout and `/trust/[orgSlug]/[systemId]` for read-only passport pages; `api/passport/*` serves widget JSON and embeddable `widget.js` (no session auth). |
| **AI-BOM** | `src/lib/ai-bom.ts` builds BOMs and CycloneDX export; persisted as `AiBom` / `AiBomComponent`; REST under `/api/v1/systems/[id]/bom` and `/export`. |

## Data Flow: Risk Classification

```
1. User adds AI system to inventory
   └→ Authenticated UI → POST /api/systems (or equivalent flow)
      └→ Prisma: INSERT ai_systems
      └→ Prisma: INSERT audit_logs

2. User requests risk classification
   └→ Route handler / internal flow
      └→ OpenRouter API: classifyAiSystem(systemMetadata)
         └→ NVIDIA Llama-class model returns: { riskTier, confidence, justification, ... }
      └→ Prisma: INSERT assessments
      └→ Prisma: UPDATE ai_systems SET risk_tier
      └→ Prisma: INSERT audit_logs

3. System generates Annex IV documentation
   └→ Document pipeline
      └→ OpenRouter API: generateDocumentSection() × sections
      └→ Prisma: INSERT documents (per section)
      └→ Prisma: INSERT audit_logs
```

Email notifications for these events are **planned**, not implemented in application code today.

## Data Flow: External integrations (summary)

```
GitHub push / PR
   └→ POST /api/github/webhook
      └→ policy-engine: load policy YAML, evaluate repo / manifest signals
      └→ Prisma: upsert GitHubInstallation, create/update CiCheckRun
      (work runs inline in the serverless request; no separate job worker)

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
│     ├─ CSP headers                                 │
│     ├─ CORS restricted to app domain             │
│     └─ Rate limiting (lru-cache, in-process)     │
│                                                   │
│  2. AUTHENTICATION                                │
│     ├─ NextAuth v5 (Credentials provider)       │
│     ├─ JWT session strategy                      │
│     └─ Prisma adapter for user/account storage   │
│                                                   │
│  3. AUTHORIZATION                                 │
│     ├─ Role-based access on admin operations      │
│     │   (destructive deletes, org settings,      │
│     │    API keys, team invites / role changes)  │
│     ├─ Organization-scoped data isolation        │
│     ├─ Public routes: passport trust + widget    │
│     │   (no login; visibility gated in config)   │
│     └─ Subscription / plan gating: schema-ready;   │
│         enforcement is not fully productized yet   │
│                                                   │
│  4. DATA PROTECTION                               │
│     ├─ Database encryption at rest: provider      │
│     │   (e.g. Neon) responsibility; app-level      │
│     │   field encryption for PII is not implemented│
│     ├─ Parameterized queries (Prisma)            │
│     ├─ Zod validation on critical endpoints      │
│     │   (register, system create, scan, …)        │
│     └─ EU-region hosting (GDPR)                  │
│                                                   │
│  5. AUDIT                                         │
│     ├─ Append-only audit log records             │
│     ├─ Audit log retention: configurable;         │
│     │   default: no automatic purge in app code   │
│     └─ AI provider calls can be reflected in      │
│         assessments / documents as configured       │
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
│  │  (Route handlers, OpenRouter)  │                │
│  └───────────────┬──────────────┘                │
└──────────────────┼───────────────────────────────┘
                   │
     ┌─────────────┼────────────────────┐
     │             │                    │
┌────▼────┐  ┌────▼─────┐  ┌──────────▼──┐
│  Neon   │  │ In-proc  │  │ OpenRouter  │
│ Postgres│  │ LRU cache│  │ (NVIDIA LLM)│
│  (EU)   │  │ (limits) │  │             │
└─────────┘  └──────────┘  └────────────┘
```

**Background jobs:** not yet implemented; GitHub webhooks, scans, and similar work are handled **inline** in route handlers (no BullMQ or Redis queue in this repository).

**Billing:** **planned** — `Organization` includes Stripe-related columns as a **schema scaffold**; there is no live Stripe checkout or webhook integration in the app code paths today.

**Email:** **planned** — invitation links can be copied from the dashboard; outbound transactional email (invites, alerts) is not wired to a provider in code.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 14.2.5 App Router | SSR for SEO, server components where used, API routes colocation |
| Mutations & server logic | Route Handlers + client fetch | JSON APIs for integrations; forms call `/api/*` routes |
| Database | Neon PostgreSQL | Serverless, EU regions, branching for dev/staging |
| ORM | Prisma | Type-safe queries, migration management, schema-first |
| AI | OpenRouter (NVIDIA Llama-class models) | Multi-model routing, structured JSON output, EU AI Act compliance classification |
| Auth | NextAuth v5 (Credentials + JWT) | Email/password auth + Prisma adapter; JWT sessions for stateless request validation |
| Email | Planned | Transactional email not integrated in application code yet |
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
| Team (session) | `src/app/api/team/route.ts`, `.../invite/route.ts`, `.../[id]/route.ts` |
| API keys (session) | `src/app/api/api-keys/route.ts` |
| Audit logs | `src/app/api/audit-logs/route.ts` |
| Deadlines | `src/app/api/deadlines/route.ts`, `.../[id]/route.ts` |
| Incidents | `src/app/api/incidents/route.ts`, `.../[id]/route.ts` |
| Public layout | `src/app/(public)/layout.tsx` |
| Trust page | `src/app/(public)/trust/[orgSlug]/[systemId]/page.tsx` |
| Passport JSON / widget | `src/app/api/passport/[systemId]/route.ts`, `src/app/api/passport/widget.js/route.ts` |
