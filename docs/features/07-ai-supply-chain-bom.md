# Feature: AI Supply Chain Compliance (AI-BOM)

**Priority:** 7  
**Analogy:** "Chainguard / Snyk for AI Supply Chains"  
**Status:** In Progress — Phase 1 (BOM generator + API) shipped

## The Pitch

The EU AI Act has explicit supply chain obligations (Art. 25). Most companies use third-party models (OpenAI, Hugging Face, Anthropic). Track compliance across the entire AI supply chain with an AI Bill of Materials.

## Why It's YC-Worthy

Nobody is doing this well. Software SBOMs (Snyk, Chainguard) are a huge market -- AI-BOMs are nascent and the regulatory mandate is coming. First-mover advantage in a category that will be mandatory.

## Key Capabilities

### AI Bill of Materials (AI-BOM)
Structured record of every model, dataset, API, and provider in your AI stack:

```yaml
# Auto-generated AI-BOM for fraud-detector-v3
ai_bom:
  version: "1.0"
  system: "fraud-detector-v3"
  generated: "2026-03-22"

  models:
    - name: "fraud-detection-ensemble"
      type: "gradient_boosted_trees"
      provider: "internal"
      version: "3.2.1"
      framework: "xgboost==2.0.3"
      license: "proprietary"

    - name: "text-embeddings"
      type: "transformer"
      provider: "openai"
      model_id: "text-embedding-3-large"
      api_version: "2026-01"
      terms_version: "2026-01-15"

  datasets:
    - name: "transaction-history"
      source: "internal"
      records: 2_400_000
      pii: true
      retention_policy: "7 years"

    - name: "synthetic-fraud-patterns"
      source: "vendor"
      provider: "FraudSim Inc."
      license: "commercial"
      contract_ref: "FSI-2025-0042"

  infrastructure:
    training: "AWS SageMaker (eu-west-1)"
    inference: "AWS ECS (eu-west-1, eu-central-1)"
    data_storage: "AWS S3 (eu-west-1)"

  dependencies:
    - "scikit-learn==1.4.0"
    - "xgboost==2.0.3"
    - "openai==1.12.0"
    - "pandas==2.2.0"
```

### Provider Compliance Registry
Pre-assessed compliance status of major model providers:

```
┌──────────────┬─────────┬───────────┬───────────┬──────────────┐
│ Provider     │ GPAI    │ Art. 25   │ Data Gov. │ Last Updated │
│              │ Status  │ Ready     │ Docs      │              │
├──────────────┼─────────┼───────────┼───────────┼──────────────┤
│ OpenAI       │ ⚠️ Partial│ ✅ Yes   │ ⚠️ Limited│ 2026-03-15  │
│ Anthropic    │ ✅ Yes   │ ✅ Yes   │ ✅ Yes    │ 2026-03-18  │
│ Google       │ ⚠️ Partial│ ✅ Yes   │ ⚠️ Limited│ 2026-03-10  │
│ Meta (Llama) │ ✅ Yes   │ ⚠️ Partial│ ✅ Yes    │ 2026-03-12  │
│ Mistral      │ ✅ Yes   │ ✅ Yes   │ ✅ Yes    │ 2026-03-20  │
│ Cohere       │ ✅ Yes   │ ✅ Yes   │ ✅ Yes    │ 2026-03-14  │
│ Stability AI │ ⚠️ Partial│ ❌ No    │ ⚠️ Limited│ 2026-03-01  │
└──────────────┴─────────┴───────────┴───────────┴──────────────┘
```

### Contractual Gap Analysis
Check if vendor agreements meet Art. 25 requirements:
- Required clauses for downstream deployer obligations
- Data processing and residency terms
- Liability and indemnification for AI-specific risks
- Right to audit and documentation access
- Model change notification obligations

### Upstream Change Alerts
When a model provider updates their terms or models, flag affected systems:

```
🔔 Upstream Change Alert

Provider: OpenAI
Change: Updated Terms of Service (effective 2026-04-01)
Impact: 12 AI systems using OpenAI models

Key Changes:
  - New data retention clause (Section 4.2)
  - Modified liability terms for EU deployments (Section 7.1)
  - Added GPAI compliance documentation (Appendix B)

Action Required:
  - Review updated terms against Art. 25 checklist
  - Update contractual gap analysis for affected systems
  - Confirm continued compliance for high-risk systems

[Review Changes] [Mark as Reviewed] [Snooze 7 days]
```

## Codebase Audit

Ground truth from `src/lib/github-scanner.ts`, `src/lib/ai-bom.ts`, `prisma/schema.prisma`, v1 BOM routes, and E2E coverage:

- **Scanner as raw material:** `scanRepository()` still produces `RepositoryScanResult` / `ScanFinding[]` (dependencies, model-like paths, API/env hints). That output is now the **input** to `generateBomFromScan()` in `src/lib/ai-bom.ts`, which builds a structured internal `AiBomData` (models, datasets, dependencies, infrastructure).
- **BOM persistence:** `AiBom` rows (`aiSystemId`, `version`, `generatedAt`, `sourceType`, optional `scanResultId`, `status`) plus normalized `AiBomComponent` rows (`componentType`, `name`, optional `version` / `provider` / `license` / `source`, `metadata` JSON string, `riskNotes`). Scan events remain on `ScanResult` (`findings` still stringified JSON); BOMs are versioned artifacts linked optionally to a scan.
- **Public API (v1):** `GET/POST /api/v1/systems/[id]/bom` — API-key auth, rate limit, CORS, org-scoped. GET returns latest BOM with components; `?all=true` lists all BOMs for the system. POST accepts `source: "scan" | "manual"`; scan path requires `scanResultId` and materializes components from stored scan JSON. `GET /api/v1/systems/[id]/bom/export?format=yaml|cyclonedx|json` returns YAML, simplified CycloneDX 1.5 JSON, or canonical JSON.
- **Exports:** Hand-built YAML (`exportBomAsYaml`) and simplified CycloneDX 1.5 (`exportBomAsCycloneDx`) with `machine-learning-model`, `library`, `data`, and `service` style components — **not** full CycloneDX AI-extension compliance yet. No SPDX export.
- **Tests:** `e2e/ai-bom.spec.ts` covers auth, CORS, route presence, and export `format` validation (six scenarios).
- **Inventory / assessment:** `AiSystem` and `Assessment` unchanged for supply-chain posture; scoring does not yet ingest BOM-specific factors.
- **Still not built:** Provider Compliance Registry (Phase 2), contractual Art. 25 gap tooling (Phase 3), upstream change monitoring (Phase 4), **manual BOM editor UI** (POST `manual` creates an empty shell only), full CycloneDX AI extension / SPDX, `PATCH` for in-place BOM edits, and lockfile-pinned versions in the generator.

## Existing Foundation

- **GitHub scanner (`src/lib/github-scanner.ts`, Octokit):** Same discovery as above; exposes `NPM_AI_PACKAGES` / `PYTHON_AI_PACKAGES` used by `ai-bom.ts` to flag AI-related dependencies in the BOM.
- **AI-BOM library (`src/lib/ai-bom.ts`):** Types `AiBomData`, `AiBomModel`, `AiBomDependency`, `AiBomDataset`, `AiBomInfrastructure`. `generateBomFromScan()` maps `RepositoryScanResult` → `AiBomData`; `bomToComponents()` flattens to DB-ready rows; `exportBomAsYaml()` / `exportBomAsCycloneDx()` for exports; `aiBomDataFromStored()` and `repositoryScanResultFromStored()` round-trip DB → DTOs.
- **V1 BOM routes:** `src/app/api/v1/systems/[id]/bom/route.ts`, `src/app/api/v1/systems/[id]/bom/export/route.ts` — aligned with `public-rest-api` patterns (API key, rate limit, CORS, org scope).
- **Prisma:** `AiBom`, `AiBomComponent` (see Codebase Audit). `ScanResult` remains the raw scan event store.
- **`AiSystem` / `Assessment`:** Unchanged; future link points for registry and Art. 25 workflows.
- **Compliance scoring:** Still a natural consumer of BOM signals once modeled.
- **E2E:** `e2e/ai-bom.spec.ts` (Playwright).
- **Stack context:** Next.js 15 App Router, Prisma, Vitest + Playwright — CycloneDX/SPDX are hand-rolled in `ai-bom.ts`, not via official schema validation libraries yet.

## Technical Specifications

### Internal AI-BOM schema & storage (implemented)

- **`AiBom`:** `id`, `aiSystemId`, `version` (string, default `"1.0"`, aligned with generated `AiBomData.version`), `generatedAt`, `sourceType` (`scan` | `manual` in API), optional `scanResultId`, `status` (e.g. `draft`), `updatedAt`. No `organizationId` on the row — tenancy enforced via `AiSystem` in route handlers.
- **`AiBomComponent`:** `bomId`, `componentType`, `name`, optional `version`, `provider`, `license`, `source`, `metadata` (JSON **string**, default `"{}"`), optional `riskNotes`. Rows are created in bulk on scan-based POST; manual POST currently creates a BOM **without** components until a UI or PATCH flow exists.

### Mapping scanner output → BOM (implemented)

- **`generateBomFromScan(result, systemName)`** in `src/lib/ai-bom.ts` consumes `RepositoryScanResult`: dependencies parsed from scanner labels (`pypi` / `npm` / `env`), AI packages matched via `PYTHON_AI_PACKAGES` / `NPM_AI_PACKAGES`, model artifacts and dataset-like paths by extension, infrastructure from aggregated `apiEndpoints` and env keys across findings.
- **`bomToComponents()`** maps the DTO into Prisma-ready component records (`componentType` discriminates model / dependency / dataset / infrastructure-style rows with serialized `metadata`).
- **`repositoryScanResultFromStored()`** rebuilds `RepositoryScanResult` from `ScanResult.repository`, `branch`, and `findings` string for POST-from-scan.

### Exports (implemented, simplified)

- **`exportBomAsYaml()`:** String YAML, no external YAML dependency.
- **`exportBomAsCycloneDx()`:** CycloneDX **1.5**-style JSON with simplified `components` (`machine-learning-model`, `library`, `data`, `service`). **Gap:** Not full CycloneDX ML/AI extension compliance (no model cards, bom-ref graph, or schema-validated output).
- **`aiBomDataFromStored()`:** Rehydrates `AiBomData` from persisted BOM + components for export GET.
- **SPDX:** Still not implemented.

### Provider registry (not implemented)

- Planned Prisma models (`AiProvider`, compliance profiles) and **`GET /api/v1/providers`**-style routes remain Phase 2; no seed or UI yet.

### Scanner & BOM lifecycle

- **`RepositoryScanResult` unchanged** at the scanner boundary; BOM is a **downstream** artifact. Lockfile-pinned versions and richer purls are still future work.

### API endpoints (implemented paths)

- **`GET/POST /api/v1/systems/[id]/bom`** — as in Codebase Audit (`?all=true` on GET).
- **`GET /api/v1/systems/[id]/bom/export?format=yaml|cyclonedx|json`** — `Content-Type` `text/yaml` or `application/json` as appropriate.
- **Not implemented:** Per-version path segments, `PATCH` manual edits, session/RBAC dashboard routes under `/api/ai-systems/...` (superseded by v1 layout above for external API).

## Implementation Approach

### Phase 1: AI-BOM Generator — **Shipped** (generator + Prisma + v1 API + E2E smoke)

1. **Done:** `ai-bom.ts` pipeline from stored or live scan results; `AiBom` / `AiBomComponent` persistence; `GET/POST` and export routes under `/api/v1/systems/[id]/bom`; YAML + simplified CycloneDX + JSON export; Playwright coverage in `e2e/ai-bom.spec.ts`.
2. **Deferred from Phase 1:** Manual BOM editor UI; `PATCH` for components; full CycloneDX AI extension validation; SPDX.

### Phase 2: Provider Registry — **Effort: L–XL** (unchanged scope; BOM components now provide a join surface)

1. Curate compliance profiles for top 20 model providers
2. Automated monitoring of provider documentation (lightweight crawlers / feeds — overlaps Phase 4 if broad)
3. Community contribution model for provider assessments
4. Provider self-assessment portal (long-term)

### Phase 3: Contractual Analysis — **Effort: L–XL**

1. Art. 25 clause checklist for vendor agreements
2. AI-powered contract review (extract relevant clauses)
3. Gap identification and template clause suggestions
4. Contract tracking and renewal alerts

### Phase 4: Change Monitoring — **Effort: L–XL** (was XL; BOM + API reduce greenfield integration, but notifications and impact graph remain large)

1. Monitor provider changelogs, terms updates, model deprecations
2. Impact analysis: which internal systems are affected (BOM/query foundation exists)
3. Notification workflow with review tracking
4. Automated compliance re-assessment triggers

## Revenue Impact

- Unique market positioning -- no direct competitor in AI-BOM space
- Enterprise value: supply chain visibility is a board-level concern
- Recurring revenue through provider monitoring subscriptions
- Partner potential with model providers wanting "certified compliant" status

## Technical Debt / Corrections

- **Doc vs schema:** `ScanResult` still uses stringified `findings` only — no separate `aiLibraries` / `modelFiles` columns. Prefer `Json` type if this area is migrated.
- **`AiSystem` field names:** Inventory uses `useCase` (not `purpose`) and has no `modelType`; keep product copy aligned with Prisma.
- **Scan vs BOM lifecycle:** Implemented split: scans stay on `ScanResult`; authoritative BOM rows on `AiBom` with optional `scanResultId`. There is still **no** `currentBomId` on `AiSystem` — “latest” is by `generatedAt` in API queries.
- **Exports:** CycloneDX output is **simplified** (1.5-style); add official schema validation / full AI extension fields and SPDX when compliance hardening is prioritized.
- **`AiBomComponent.metadata`:** Stored as `String` JSON — same typing consideration as `findings`.
- **Manual BOM:** POST `source: "manual"` creates an empty BOM shell — components require future UI + `PATCH` or expanded POST body.
- **Provider registry is greenfield:** Registry UI, editorial workflow, and legal review remain net-new; `AiSystem.provider` is still a free string — normalization TBD.
