# Feature: Multi-Regulation Compliance Graph

**Priority:** 3  
**Analogy:** "Vanta for AI" (multi-framework)  
**Status:** Proposed — **significant new development required.** The product today is **EU AI Act–only**: classification, scoring, Annex IV docs, and assessments are all single-framework. There is a **strong foundation** in that one framework (deep engine + schema hooks for risk and compliance state), but multi-regulation graph, cross-mapping, and applicability logic are **not started**.

## The Pitch

EU AI Act is just the opening wedge. The same AI system needs to comply with **5-10 overlapping regulations**. Build a unified compliance graph that maps requirements across frameworks and eliminates redundant work.

## Why It's YC-Worthy

Massive TAM expansion. Enterprises won't buy 6 tools for 6 regulations. The "Vanta for AI" positioning requires multi-framework coverage. Cross-mapping regulatory requirements creates a knowledge moat that's expensive to replicate.

## Supported Frameworks

### Tier 1 (Launch)

- **EU AI Act** — implemented end-to-end (classification, scoring, Annex IV, assessments)
- **NIST AI RMF** — US federal agencies + government contractors *(not in codebase)*
- **ISO 42001** — AI management system standard (certification-driven adoption) *(not in codebase)*

### Tier 2 (Fast Follow)

- **Canada AIDA** (Artificial Intelligence and Data Act) — upcoming legislation
- **Brazil AI Act** — upcoming legislation
- **GDPR Article 22** — automated individual decision-making

### Tier 3 (Sector-Specific)

- **FDA** — medical AI devices (SaMD guidance)
- **ECB / EBA** — financial AI (banking supervision guidelines)
- **EEOC / NYC Local Law 144** — employment AI (bias audits)
- **CCPA / CPRA** — California automated decision-making rights

## Key Capabilities

### Compliance Matrix View

One AI system, all applicable regulations, with clear status per framework:

```
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Requirement         │ EU AI Act│ NIST RMF │ ISO 42001│ GDPR     │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Risk Assessment     │ ✅ Done  │ ✅ Done  │ ✅ Done  │ ⬜ N/A   │
│ Bias Testing        │ ✅ Done  │ ✅ Done  │ ⚠️ Partial│ ⬜ N/A   │
│ Human Oversight     │ ❌ Gap   │ ✅ Done  │ ❌ Gap   │ ✅ Done  │
│ Data Governance     │ ⚠️ Partial│ ⚠️ Partial│ ❌ Gap   │ ✅ Done  │
│ Impact Assessment   │ ⬜ N/A   │ ✅ Done  │ ⬜ N/A   │ ❌ Gap   │
│ Transparency Notice │ ✅ Done  │ ⬜ N/A   │ ✅ Done  │ ✅ Done  │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

### Cross-Mapping Engine

Automatically identify where compliance work satisfies multiple frameworks:

- EU AI Act Art. 9 (Risk Management) ↔ NIST AI RMF GOVERN + MAP functions
- EU AI Act Art. 10 (Data Governance) ↔ ISO 42001 Clause 6.1.2
- EU AI Act Art. 13 (Transparency) ↔ GDPR Art. 13-14 + NIST AI RMF GOVERN 4

Show users: "Completing your EU AI Act risk assessment also satisfies 70% of NIST AI RMF requirements."

### Smart Applicability Detection

Based on system metadata (sector, geography, use case, data subjects), automatically determine which regulations apply:

```
System: "Credit Scoring Model"
Sector: Financial Services
Geography: EU + US
Data Subjects: EU residents

Applicable Frameworks:
  ✅ EU AI Act (Annex III, Category 5b -- high-risk)
  ✅ NIST AI RMF (US operations)
  ✅ GDPR Art. 22 (automated decisions affecting EU residents)
  ✅ EBA Guidelines (financial sector AI)
  ⬜ FDA (not medical)
  ⬜ Canada AIDA (no Canadian operations)
```

### Unified Gap Analysis

Single prioritized action list across all applicable frameworks, with effort saved by cross-compliance:

```
Action Plan (3 items to reach full compliance across 4 frameworks):

1. Create Human Oversight Plan
   Satisfies: EU AI Act Art. 14, NIST RMF GOVERN 1.3, ISO 42001 A.7.2
   Effort: ~4 hours
   Impact: Closes gaps in 3 frameworks simultaneously

2. Complete Data Protection Impact Assessment
   Satisfies: GDPR Art. 35, EU AI Act Art. 9 (partial)
   Effort: ~8 hours
   Impact: Required for GDPR, contributes to EU AI Act

3. Update Data Governance Documentation
   Satisfies: EU AI Act Art. 10, ISO 42001 Clause 7.5
   Effort: ~2 hours
   Impact: Closes remaining gaps
```

## Codebase Audit

**Stack (as implemented):** Next.js 15 App Router, Prisma on PostgreSQL (e.g. Neon), NextAuth v4, Anthropic Claude SDK, Stripe, AgentMail, Octokit. There is **no** tRPC, Redis/Upstash, BullMQ, Clerk, vector DB, or pgvector in this repo.

**EU AI Act — strong single-framework foundation**

- **`src/lib/claude.ts`** — Full risk classification: tiers `unacceptable` | `high` | `limited` | `minimal`, confidence, justification, `keyArticles`, Annex III category hints, requirements and recommendations. Includes `mockClassifyRiskTier` (rule-based) and Claude-backed paths when the API is available.
- **`.cursor/skills/eu-ai-act-compliance-assessment/`** — Deep domain grounding (Article 5, Article 6 + Annex III, sector notes) suitable to extend or to mirror for other frameworks.
- **`src/lib/compliance-scoring.ts`** — 0–100 compliance score from EU AI Act–shaped criteria (risk classification, Annex IV sections, conformity assessment, incidents, deadlines, transparency).
- **Prisma `AiSystem`** — `riskTier`, `complianceStatus`, `complianceScore`, `sector`, `useCase`, `description`, `deploymentRegion`, and related relations; inventory is real and used by classification inputs.
- **Prisma `Assessment`** — Persists `riskTier`, `confidence`, `justification`, `keyArticles`, `requirements`, `recommendations` (stored as JSON strings), plus `annexIiiCategory`, gaps, raw model output. **No `framework` or regulation identifier** — every assessment is implicitly EU AI Act.
- **Annex IV doc generator** — EU AI Act Annex IV only (not a generic multi-standard template engine yet).
- **Public API** — Example: `POST /api/v1/systems/[id]/classify` creates an `Assessment` via `classifyRiskTier` only; no framework parameter.

**Multi-framework — not present**

- No NIST AI RMF, ISO 42001, GDPR Art. 22, or other framework engines, prompts, or requirement catalogs in code.
- No cross-mapping tables, applicability service, or unified matrix UI.
- Schema cannot distinguish assessments or evidence by regulation; extending to multiple frameworks **requires data model and API design work**, not just UI.

**Bottom line:** Shipping this feature is **large net-new product engineering** (knowledge base, mappings, multi-assessment UX, scoring redesign) on top of a **solid EU AI Act core**, not a thin layer over “already multi-framework” internals.

## Existing Foundation

| Area | What exists today | Relevance to multi-regulation graph |
|------|-------------------|-------------------------------------|
| Classification | `classifyRiskTier` + types in `src/lib/claude.ts`; EU AI Act outputs only | Extend with `framework` (or parallel functions per framework) and structured citations per regulation |
| Assessments | `Assessment` rows linked to `AiSystem`; JSON-string fields for articles/requirements/recommendations | Add framework dimension; possibly multiple assessments per system per framework |
| Scoring | `compliance-scoring.ts` — 0–100, criteria tied to Annex IV, conformity, incidents, EU deadlines | Refactor into per-framework scores + optional rollup; criteria are not generic today |
| Inventory | `AiSystem` metadata (sector, use case, region, etc.) | Good input for an applicability engine once rules exist |
| Docs / export | Annex IV–oriented generation and export flows | EU-specific; other frameworks need separate templates or a generalized doc model |
| Auth / billing | NextAuth, Stripe, etc. | Unchanged; org-scoped data works for multi-framework if schema supports it |

## Technical Specifications

### Prisma / data model

1. **`Assessment`**
   - Add `framework` (string enum or FK to a `Regulation` table), e.g. `eu_ai_act`, `nist_ai_rmf`, `iso_42001`.
   - Consider unique constraint `(aiSystemId, framework)` if one “current” assessment per framework is desired, or allow history with `version` / `supersededAt`.
   - Optional: framework-specific JSON blobs (`frameworkPayload`) for outputs that do not map to today’s EU-shaped columns.

2. **`RegulationRequirement` (new)**
   - Stable IDs per framework: `regulationId`, `code` (e.g. article/clause), `title`, `description`, `category`, optional `parentId` for hierarchies.
   - Enables matrix rows and gap analysis without hard-coding strings in the UI.

3. **Cross-mapping (new)**
   - e.g. `RequirementMapping` with `sourceRequirementId`, `targetRequirementId`, `mappingType` (`equivalent`, `partial`, `supports`), `notes`, `confidence`.
   - Backed by curated data (seed/migration or admin CMS), not inferred-only at first.

4. **`AiSystem` (optional extensions)**
   - Jurisdiction flags, `dataSubjectsRegions`, or normalized `SystemJurisdiction` rows if applicability goes beyond a single `deploymentRegion` string.

5. **Evidence / tasks (future)**
   - Link completed work to `RegulationRequirement` IDs for “done / partial / gap” in the matrix.

### Extending `claude.ts` for multi-framework classification

- Introduce a **framework parameter** (or separate entrypoints per framework) that selects system prompt + output schema (each framework may not use “risk tier” the same way as the EU AI Act).
- Shared **`SystemMetadata`** can remain; add optional fields needed for applicability (regions, data subject categories).
- Normalize persistence: map each framework’s model output into `Assessment` + optional `RegulationRequirement` references (IDs), not only free-text lists.
- Keep **`mockClassifyRiskTier`** as EU-only fallback; add mocks or feature flags per framework for tests and offline mode.

### API surface (indicative)

Existing routes assume a single classification path. New or extended endpoints might include:

- `POST /api/v1/systems/[id]/assess` — body: `{ framework }` (or multiple); creates/updates framework-scoped assessments.
- `GET /api/v1/systems/[id]/assessments` — query: `?framework=` or list all.
- `GET /api/v1/regulations` — list supported frameworks and metadata.
- `GET /api/v1/regulations/[code]/requirements` — paginated requirement catalog (auth + caching as needed).
- `GET /api/v1/systems/[id]/compliance-matrix` — aggregated status using mappings + evidence (could be server component data fetch initially).

Internal app routes (non–public API) would mirror the same operations for the dashboard. The current `POST .../classify` behavior should remain **backward compatible** (implicit `eu_ai_act`) or be versioned.

## Implementation Approach

### Phase 1: Regulatory Knowledge Base — **L**

1. Model regulation requirements as structured data (articles → requirements → evidence)
2. Build cross-mapping tables between frameworks
3. Start with EU AI Act ↔ NIST AI RMF ↔ ISO 42001

### Phase 2: Multi-Framework Assessment — **XL**

1. Extend risk classification to support multiple frameworks per system (schema + `claude.ts` + persistence)
2. Build compliance matrix UI
3. Implement cross-compliance savings calculator

### Phase 3: Applicability Engine — **L**

1. Auto-detect applicable frameworks from system metadata
2. Jurisdiction-aware assessment (geography, sector, data subjects)
3. Guided framework selection wizard

### Phase 4: Expand Framework Coverage — **XL** (ongoing)

1. Add GDPR Art. 22, Canada AIDA, Brazil AI Act
2. Sector-specific regulations (FDA, ECB)
3. Community-contributed framework definitions

**Overall:** Treat the initiative as **multiple L/XL phases**; parallel work on data seeding and legal review of mappings will dominate calendar time, not just engineering.

## Revenue Impact

- 5x TAM expansion beyond EU AI Act alone
- Enterprise deal size multiplier (multi-framework = higher ACV)
- Regulatory moat: deep knowledge mapping is expensive to replicate
- Natural upsell path: start with one framework, expand as regulations apply

## Technical Debt / Corrections

- **Doc vs code:** Earlier drafts implied “extensible” scoring and schema “already” supported multi-framework work. In reality, **compliance scoring and `Assessment` rows are EU AI Act–shaped**; extension is a deliberate redesign, not configuration.
- **`Assessment` field names:** Persisted `keyArticles` / `requirements` / `recommendations` are JSON **strings** in Prisma — any multi-framework work should plan for typed JSON columns or normalized tables to avoid stringly-typed drift across regulations.
- **No shared “framework” abstraction** in the DB or domain layer — introducing one avoids forking ad hoc string columns per regulation.
- **Annex IV generator:** Describing it as a “template system adaptable to other frameworks” overstates readiness; it is **EU Annex IV–specific** until abstracted.
- **Avoid assuming infra not in repo:** Designs should not rely on Redis job queues, vector search, or tRPC unless the project explicitly adds them.
