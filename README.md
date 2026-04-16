<div align="center">

# 🛡️ ComplianceForge

**The compliance infrastructure layer for AI**

*Open-source EU AI Act compliance platform — classify, document, and monitor AI systems with CI/CD integration, developer SDK, and public trust pages.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## Why ComplianceForge

- **EU AI Act enforcement** for many obligations is **August 2, 2026** — the window to build real compliance is closing.
- **Penalties** can reach up to **7% of global annual turnover** or **€35 million** (whichever is higher), depending on the breach and actor category.
- **Every organization** shipping or operating AI in the EU needs **repeatable** classification, documentation, evidence, and monitoring — not one-off consultant PDFs.
- **ComplianceForge** automates the heavy lifting: inventory, risk tiering, gaps, evidence, CI checks, and **public trust** surfaces your customers and auditors can actually use.

## Implemented today (working in the app)

- **AI risk classification** — EU AI Act–oriented risk tiering via **OpenRouter** (default: **NVIDIA Llama**-class models).
- **AI system inventory** — Org-scoped systems with assessments, documents, and compliance metadata.
- **GitHub App + policy engine** — Webhook-driven checks; `complianceforge.yml` evaluated on PRs; `CiCheckRun` records.
- **Compliance tracker, reports, calendar / deadlines** — Dashboard tabs backed by Prisma models and `/api/*` routes.
- **Incidents** — Log and track incidents per AI system.
- **Audit log viewer** — Read org audit trail from `AuditLog`.
- **API key management** — Create and revoke org API keys for `/api/v1` (hashed at rest).
- **Organization settings** — Org name/slug and related settings for admins.
- **Team management** — List members, invite flow (link-based; copy invite URL), role updates and removal for admins.
- **Compliance Passport** — Public trust routes and `/api/passport/*` for JSON + embeddable widget.
- **AI-BOM** — Bill of materials CRUD and CycloneDX-oriented export under `/api/v1`.
- **Auth** — NextAuth v5 credentials + JWT; Prisma user/org storage.

## Planned or schema-only (not fully productized)

- **Billing / Stripe** — `Organization` includes Stripe customer/subscription IDs; no live Stripe integration in route handlers yet.
- **Outbound email** — No transactional provider wired for invites, alerts, or “report ready” notifications (invites use manual link copy).
- **Invite acceptance UX** — Invitations are stored and links use a `?invite=` URL pattern; full sign-up redemption flow may still need product work.
- **Background job queue** — No BullMQ/Redis; long work runs inline in serverless handlers.
- **Distributed rate limiting** — In-process LRU cache per instance; no shared Redis layer.

## Key features (roadmap + positioning)

1. **AI risk classification** — Automated EU AI Act risk tier assessment (OpenRouter / NVIDIA Llama-class models).
2. **CI/CD integration** — GitHub App that runs compliance checks on PRs (*policy-as-code* alongside your repo).
3. **Compliance-as-code SDK** — REST under `/api/v1` with **API key** auth for pipelines and automation.
4. **Compliance Passport** — **Public trust pages** plus an **embeddable widget** so compliance status can travel with your product.
5. **AI-BOM (Bill of Materials)** — **CycloneDX 1.5**-oriented transparency for models and supply-chain posture.
6. **Policy engine** — Repo-level **`complianceforge.yml`** evaluated in CI.
7. **Compliance scoring** — **EU AI Act maturity score (0–100)** aligned with Annex IV–style documentation and evidence expectations.

## Tech stack

| Layer | Choices |
|--------|---------|
| **App** | Next.js **14.2** (App Router), React **18**, TypeScript |
| **Data** | Prisma ORM, **PostgreSQL** (e.g. Neon) |
| **Auth** | **NextAuth v5** — Credentials provider + **JWT** sessions |
| **UI** | Tailwind CSS, **shadcn/ui**, Recharts, **Sonner** toasts |
| **AI** | **OpenRouter** (default: **NVIDIA Llama** family models) |
| **Validation** | **Zod** on critical HTTP endpoints (e.g. register, system create, scan) — not every handler |
| **Quality** | **Playwright** E2E tests, **Vitest** for unit tests |

## Quick start

```bash
git clone https://github.com/complianceforge/complianceforge.git
cd complianceforge
npm install
cp .env.example .env
# Edit .env with your database URL and API keys
npx prisma db push
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Architecture overview

High-level layout (see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full picture):

```
src/app/          → Next.js App Router pages & API routes
src/components/   → React components (dashboard + shadcn/ui primitives)
lib/              → Core business logic (scoring, policy engine, AI provider, scanner)
prisma/           → Database schema
e2e/              → Playwright E2E tests
docs/             → Feature specs & architecture docs
```

## API overview (v1)

Bearer **API key** (`Authorization: Bearer …` or `x-api-key` — see route handlers). Base path: `/api/v1`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/systems/:id/score` | Compliance score |
| `GET` | `/api/v1/systems/:id/gaps` | Compliance gaps |
| `GET` / `POST` | `/api/v1/systems/:id/evidence` | Evidence management |
| `GET` / `POST` | `/api/v1/systems/:id/bom` | AI Bill of Materials |
| `GET` / `PATCH` | `/api/v1/systems/:id/passport` | Passport configuration |
| `GET` | `/api/v1/systems/:id/documents` | Documentation |

## Contributing

Issues and PRs are welcome. Please keep changes focused, match existing patterns (App Router, Prisma, shared `lib/` helpers), and run **`npm run lint`** before submitting. For larger features, open an issue first so we can align on scope and data model impact.

## License

[MIT](./LICENSE)
