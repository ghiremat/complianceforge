# Feature: Compliance-as-Code SDK

**Priority:** 2
**Analogy:** "Stripe for AI Compliance"
**Status:** Shipped — v1 API complete, client SDKs not started

## The Pitch

Let developers embed compliance directly into ML pipelines with a Python/TypeScript SDK. Turn ComplianceForge from a dashboard people visit monthly into infrastructure that's called thousands of times daily.

## Why It's YC-Worthy

API usage = usage-based revenue. Deep integration creates high switching costs. ComplianceForge already has the REST API foundation -- the SDK is the developer-friendly wrapper.

## Key Capabilities

### Python SDK

```python
from complianceforge import ComplianceForge

cf = ComplianceForge(api_key="cf_live_...")

# Register model at training time
system = cf.register(
    name="fraud-detector-v3",
    sector="financial_services",
    purpose="credit scoring",
    model_type="gradient_boosted_trees",
    training_data={"source": "internal", "records": 2_400_000}
)

# Auto-classify risk tier
assessment = system.classify()  # → high_risk (Annex III, Category 5b)

# Gate deployment on compliance
if not system.is_compliant():
    raise ComplianceError("Missing: human oversight plan, bias testing report")

# Attach evidence from training pipeline
system.attach_evidence(
    category="testing",
    source="fairlearn",
    metrics=fairness_report.to_dict()
)

# Log inference for monitoring
system.log_inference(
    input_hash=hash(features),
    output=prediction,
    confidence=0.94,
    metadata={"user_segment": "retail"}
)
```

### TypeScript SDK

```typescript
import { ComplianceForge } from '@complianceforge/sdk';

const cf = new ComplianceForge({ apiKey: process.env.CF_API_KEY });

const system = await cf.register({
  name: 'content-moderator-v2',
  sector: 'digital_platforms',
  purpose: 'content moderation',
  modelType: 'transformer',
});

const assessment = await system.classify();
console.log(assessment.riskTier);    // 'high_risk'
console.log(assessment.legalBasis);  // 'Annex III, Category 1(a)'

if (!(await system.isCompliant())) {
  throw new ComplianceError(await system.getGaps());
}
```

### CLI Tool

```bash
# Register from model card
complianceforge register --from-model-card ./model_card.yaml

# Check compliance status
complianceforge check fraud-detector-v3
# ❌ fraud-detector-v3: 2 gaps found
#    - Missing: human oversight plan
#    - Missing: bias testing report (last run: 47 days ago, max: 30 days)

# Gate CI/CD pipeline
complianceforge gate fraud-detector-v3 --fail-on-gaps
```

## SDK Design Principles

1. **Zero-config start** -- `pip install complianceforge` + API key is all you need
2. **Pipeline-native** -- works in Jupyter, scripts, Airflow DAGs, Kubeflow pipelines
3. **Non-blocking by default** -- async logging, sync gating only when explicitly requested
4. **Framework integrations** -- first-class support for PyTorch, TensorFlow, HuggingFace, scikit-learn, MLflow
5. **Idempotent operations** -- safe to call repeatedly (re-registration updates, doesn't duplicate)

## Existing Foundation

What is **in production today** in this repo (the SDK’s real backend contract):

- **Public REST API (`/api/v1/`)** — Next.js App Router route handlers, not tRPC. Bearer API keys (`cf_…`) validated in `src/lib/api-auth.ts` against hashed rows in Prisma `ApiKey`; org-scoped data access. Shared handler pattern: `validateApiKey`, `withRateLimit`, `addCorsHeaders`, `handleCorsPreFlight` (see `src/lib/api-middleware.ts`); CORS via `src/lib/cors.ts`; rate limiting via in-process LRU cache (`src/lib/rate-limit.ts`), not Redis.
- **Systems CRUD** — `GET`/`POST` `/api/v1/systems`, `GET`/`PATCH`/`DELETE` `/api/v1/systems/[id]`; payloads validated with Zod (`createAiSystemSchema` and route-local PATCH rules in `src/types/index.ts`).
- **Classification** — `POST` `/api/v1/systems/[id]/classify` runs `classifyRiskTier` from `src/lib/claude.ts`, persists `Assessment`, updates `AiSystem` risk tier and a mapped compliance score.
- **Compliance gaps** — `GET` `/api/v1/systems/[id]/gaps` loads the latest `Assessment`, calls `calculateComplianceScore()`, returns criteria where earned < max plus assessment justification, requirements, and recommendations.
- **Compliance score** — `GET` `/api/v1/systems/[id]/score` returns the full score breakdown with criteria.
- **Annex IV documents (v1)** — `GET` `/api/v1/systems/[id]/documents` lists Annex IV documents; supports optional `?section=N` filter.
- **Evidence** — `GET`/`POST` `/api/v1/systems/[id]/evidence`: lists documents and conformity-assessment evidence; `POST` creates a `Document` or appends URLs to `ConformityAssessment.evidenceUrls`.
- **AI Bill of Materials** — `GET`/`POST` `/api/v1/systems/[id]/bom`, `GET` `/api/v1/systems/[id]/bom/export`.
- **Passport** — `GET`/`PATCH` `/api/v1/systems/[id]/passport` for passport configuration.
- **Incidents** — `GET`/`POST` `/api/v1/incidents` for listing and creating incidents tied to org systems.
- **Compliance scoring logic** — `src/lib/compliance-scoring.ts`; v1 `score`/`gaps` routes and list/get system responses expose scores and status where populated.
- **Session export** — richer HTML/PDF/DOCX pack export may still live on session/authenticated routes (e.g. `src/app/api/export/[systemId]/route.ts`); v1 covers documents listing and BOM export as above.
- **E2E coverage** — `e2e/sdk-api.spec.ts` (11 tests): auth protection and CORS on v1 endpoints, route existence, `POST` evidence.
- **Core stack** — Next.js 15 App Router, Prisma + PostgreSQL (e.g. Neon), NextAuth v4 + session/cookie patterns, Anthropic SDK, Stripe, AgentMail, Octokit. Server mutations also live in `src/server/actions.ts` alongside API routes.

## Codebase Audit

| Area | In codebase | Implication for SDK |
|------|-------------|---------------------|
| v1 REST API (full surface below) | Yes | **This is the SDK backend:** systems CRUD, classify, gaps, score, Annex IV documents, evidence, BOM (+ export), passport, incidents — all org-scoped with API keys, CORS, and rate limits. |
| Python SDK (`pip install complianceforge`) | No | Greenfield: PyPI publishing, HTTP client, types, retries, docs. |
| TypeScript SDK (`npm @complianceforge/sdk`) | No | Greenfield: npm package mirroring the same v1 contract. |
| CLI (`complianceforge check`, `gate`, …) + GitHub Action | No | Greenfield; can wrap the same v1 endpoints. |
| Framework integrations (PyTorch, HuggingFace, MLflow, …) | No | Greenfield; depends on client SDKs and optional thin adapters. |
| `get_gaps()` / rich gap list | Yes | `GET /systems/:id/gaps` — latest assessment + `calculateComplianceScore()`; gaps where earned &lt; max. |
| `is_compliant()` / score detail | Yes | `GET /systems/:id` (status/score fields), `GET /systems/:id/score` (full breakdown), `GET /systems/:id/gaps` for explicit gap list; document SDK semantics vs full conformity workflow. |
| `attach_evidence()` | Partial | `GET`/`POST` `/systems/:id/evidence` — documents + `ConformityAssessment.evidenceUrls`; SDK can wrap honest attach/list flows. |
| Annex IV docs from API | Yes (v1) | `GET /systems/:id/documents` with optional `?section=N`. |
| BOM / passport | Yes (v1) | `GET`/`POST` `/systems/:id/bom`, `GET` `/systems/:id/bom/export`, `GET`/`PATCH` `/systems/:id/passport`. |
| `log_inference()`, batch inference logging | No matching v1 endpoints | **New** API surface (and likely quotas/distributed rate limits) if product wants high-volume logging. |
| API key rotation | Create/revoke in product (see settings API keys UI) | SDK should document key lifecycle; confirm whether multiple active keys per org meet “rotation” needs. |

**Bottom line:** The **v1 public API is complete** for integration (systems, classification, scoring, gaps, documents, evidence, BOM, passport, incidents). **Remaining work is client-side:** Python and TypeScript SDK packages, CLI, GitHub Action, framework integrations, and any future endpoints (e.g. inference logging) — not expanding the core v1 route map.

## Technical Specifications

Base URL: `{origin}/api/v1` (e.g. production app host). Auth: `Authorization: Bearer <cf_…>`.

### Endpoint map (current v1)

| Method | Path | Role |
|--------|------|------|
| GET | `/systems` | List org AI systems |
| POST | `/systems` | Create system (`register`) |
| GET | `/systems/:id` | Fetch system (`refresh`, compliance fields) |
| PATCH | `/systems/:id` | Update metadata (idempotent re-register / upsert-style updates) |
| DELETE | `/systems/:id` | Delete system |
| POST | `/systems/:id/classify` | Run risk classification (`classify()`); returns `classification`, `assessment`, `system` |
| GET | `/systems/:id/gaps` | Compliance gaps from latest assessment + scoring (earned < max, justification, requirements, recommendations) |
| GET | `/systems/:id/score` | Full compliance score breakdown with criteria |
| GET | `/systems/:id/documents` | Annex IV documents; optional `?section=N` |
| GET, POST | `/systems/:id/evidence` | List evidence (documents + conformity URLs); create document or append `evidenceUrls` |
| GET, POST | `/systems/:id/bom` | AI Bill of Materials |
| GET | `/systems/:id/bom/export` | BOM export |
| GET, PATCH | `/systems/:id/passport` | Passport configuration |
| GET | `/incidents` | List incidents |
| POST | `/incidents` | Create incident (serious incident / ops workflows) |

### SDK method → HTTP mapping (target contract)

| SDK method (conceptual) | Maps to today | Notes |
|---------------------------|---------------|--------|
| `register(...)` / upsert | `POST /systems` or `PATCH /systems/:id` | Zod expects `useCase` (string), not a separate `purpose` field — SDK can accept `purpose` and send `useCase`. Optional fields: `description`, `sector`, `provider`, `version`, `dataInputs`, `decisionImpact`, `endUsers`, `deploymentRegion` (default `EU`). `sourceRepo` accepted on create body. Structured `training_data` / `model_type` are not first-class API fields yet; SDK may serialize into `description` or `dataInputs` until the API evolves. |
| `classify()` | `POST /systems/:id/classify` | Requires at least one **dashboard user** in the org (`getOrganizationActorUserId`); otherwise 400. Response includes full `classification` + `assessment` (gap-related JSON in assessment fields). |
| `is_compliant()` | `GET /systems/:id`, `GET /systems/:id/score`, `GET /systems/:id/gaps` | Interpret `complianceStatus`, `complianceScore`, `riskTier`; use score/gaps for explicit breakdown. Define clear SDK semantics (e.g. unacceptable ⇒ not compliant). |
| `get_gaps()` | `GET /systems/:id/gaps` | Latest assessment + `calculateComplianceScore()`; no need to re-run classify for a structured gap list. |
| `attach_evidence()` | `GET`/`POST /systems/:id/evidence` | List/create evidence; `POST` creates `Document` or appends to `ConformityAssessment.evidenceUrls`. |
| Annex IV sections (read) | `GET /systems/:id/documents` | Optional query `section` filter. |
| BOM / passport (SDK TBD) | `GET`/`POST /systems/:id/bom`, `GET /systems/:id/bom/export`, `GET`/`PATCH /systems/:id/passport` | Wrap for inventory and EU AI Act passport workflows. |
| `log_inference()` | *Not in v1* | Design high-volume endpoint; rate limits today are per-process LRU — distributed limits may be needed at scale. |
| CLI `check` / `gate` | `GET /systems/:id`, `GET /systems/:id/gaps`, `GET /systems/:id/score` | Same semantics as TS/Python clients once CLI exists. |

### Prisma domain models (relevant to SDK roadmap)

`Organization`, `User`, `AiSystem`, `Assessment`, `Document`, `Incident`, `AuditLog`, `ScanResult`, `ComplianceDeadline`, `ConformityAssessment`, `ApiKey`, `Invitation` — SDK features should align with which of these become API-key accessible vs session-only.

## Implementation Approach

### v1 REST API (backend) — **Complete**

All org-scoped routes listed in **Endpoint map** are implemented with the shared v1 pattern (`validateApiKey`, `withRateLimit`, `addCorsHeaders`, `handleCorsPreFlight`). **Phase 1–2 API work** (systems, classify, incidents, gaps, score, documents, evidence, BOM, passport) is done. Regression coverage: `e2e/sdk-api.spec.ts` (auth, CORS, route smoke, `POST` evidence).

### Phase 1: Core Python SDK — **M** *(not started — backend ready)*

1. Publish `complianceforge` package on PyPI (`pip install complianceforge`)
2. Implement: `register()`, `classify()`, `is_compliant()`, `get_gaps()` via `GET /systems/:id/gaps` (and `GET /systems/:id/score` as needed)
3. API key authentication with key rotation support (document revoke/create; optional helper patterns)
4. Comprehensive error handling and retries

### Phase 2: Evidence & richer pipeline hooks — **L** *(partially unblocked on API)*

1. **`attach_evidence()`** — can target `GET`/`POST /systems/:id/evidence` (documents + conformity evidence URLs)
2. **`log_inference()`** for production monitoring — **still needs new v1 endpoints**
3. Batch API for high-throughput inference logging — **still needs new v1 endpoints** and possibly storage/quotas
4. Integration adapters for MLflow, W&B, Fairlearn — SDK/framework work once clients exist

*Inference logging and batch APIs remain product/engineering work; evidence listing/attach is backed by v1.*

### Phase 3: TypeScript SDK + CLI — **M** *(not started — backend ready)*

1. Publish `@complianceforge/sdk` on npm
2. CLI tool for CI/CD pipelines (`complianceforge check`, `complianceforge gate`, …)
3. GitHub Action wrapping the CLI

### Phase 4: Framework Integrations — **XL** *(not started)*

1. PyTorch Lightning callback
2. HuggingFace Trainer integration
3. MLflow plugin
4. Kubeflow pipeline component

**Remaining work summary:** **Phases 3–4** plus **Phase 1–2 client deliverables** (Python package, TS package, CLI, framework adapters). The v1 HTTP surface does not need to grow for a credible first SDK beyond optional future endpoints (e.g. inference logging).

## Technical Debt / Corrections

- **README vs repo:** Root `README.md` still lists **tRPC**, **TipTap**, **React Flow**, **Redis/Upstash**, **BullMQ**, **Clerk**, embeddings/vector DB, and a tRPC-centric architecture diagram. The implemented app uses **server actions + REST routes**, **NextAuth**, **in-memory rate limiting**, and does not include those dependencies as described — update README when prioritizing docs accuracy.
- **Pitch examples vs API:** Sample SDK snippets use names like `purpose` and `model_type`; the v1 create schema uses **`useCase`** and stringly-typed optional fields (`dataInputs`, etc.). SDK or API evolution should converge these for a frictionless DX.
- **Classify attribution:** API classification fails if the org has no users — API-key-only orgs need a product decision (synthetic actor, service user, or relaxed FK).
- **Annex IV via API:** `GET /api/v1/systems/:id/documents` (and optional `section`) is on v1; session-based pack export may still differ from v1 — align README “API-first / CLI” narrative with documents vs full HTML/PDF export paths.
- **Scale:** Rate limits are **per instance** (LRU). Horizontal scaling without a shared limiter changes behavior unless upgraded to Redis or edge limits.

## Revenue Impact

- Usage-based pricing per API call
- Tiered plans by volume (startup: 10K calls/mo, growth: 100K, enterprise: unlimited)
- High switching cost once integrated into ML pipelines
- Natural expansion as teams add more models
