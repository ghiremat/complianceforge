# ComplianceForge Feature Roadmap

Strategic feature roadmap organized by impact for YC application positioning.
**Last audited against codebase:** March 27, 2026

## Strategic Thesis

ComplianceForge is building the **compliance infrastructure layer for AI**. Developers integrate us in CI and their ML pipelines. Every AI system they ship becomes a trust page that sells ComplianceForge to their customers. That's a platform story with built-in distribution.

## Priority Ranking

| Priority | Feature | Analogy | Status | Effort | Why It Matters |
|----------|---------|---------|--------|--------|----------------|
| **1** | [CI/CD Integration](features/01-cicd-integration.md) | Snyk for AI Compliance | In Progress — Phase 1 core shipped | M | Turns a dashboard into developer infrastructure. Huge "aha" demo moment. |
| **2** | [Compliance-as-Code SDK](features/02-compliance-as-code-sdk.md) | Stripe for AI Compliance | Shipped — v1 API complete | S (remaining: SDK clients) | Usage-based revenue, deep integration, high switching cost. |
| **3** | [Multi-Regulation Graph](features/03-multi-regulation-graph.md) | Vanta for AI | Not Started | XL | 5x TAM expansion, enterprise deal size multiplier. |
| **4** | [Compliance Passport](features/04-compliance-passport.md) | Trust Center for AI | In Progress — Phase 1+3 shipped | M (remaining: Phase 2+4) | Viral growth loop -- every customer becomes a distribution channel. |
| **5** | [Automated Evidence Collection](features/05-automated-evidence-collection.md) | Vanta Integrations | Early Foundation | XL | Vanta playbook, proven at scale for SOC 2. |
| **6** | [Live Model Monitoring](features/06-live-model-monitoring.md) | Datadog for AI Compliance | Not Started | XL–XXL | Recurring revenue anchor, but harder to build. |
| **7** | [AI Supply Chain / AI-BOM](features/07-ai-supply-chain-bom.md) | Chainguard for AI | In Progress — Phase 1 shipped | L (remaining: registry + monitoring) | Unique positioning, but market is early. |
| **8** | [Compliance Co-pilot](features/08-compliance-copilot.md) | AI Advisor | Not Started | L–XL | Differentiator, but harder to demo in 2 minutes. |

## Readiness Assessment

Post-audit reality check — what the codebase actually supports today vs. what each feature needs.

### Tier 1: Ship Next (strong foundation, partially shipped)

| Feature | What's Shipped | Key Gap | Remaining Work |
|---------|---------------|---------|----------------|
| **CI/CD Integration** | `policy-engine.ts`, `api/github/webhook` (HMAC verification, installation + PR events), `api/github/check-runs/[id]`, `GitHubInstallation` + `CiCheckRun` models, E2E tests | GitHub App prod registration, native Checks API, inline bot comments, repo-synced `complianceforge.yml` | Checks API + comments (**S–M** each); GitLab/Bitbucket **XL** |
| **Compliance-as-Code SDK** | Full v1 REST API (systems CRUD, classify, gaps, score, documents, evidence, BOM, BOM export, passport, incidents), API key auth, CORS, rate limiting, E2E tests | Python/TS SDK packages, CLI tool, framework integrations | SDK client wrappers (**M** each); CLI **S–M** |
| **Compliance Passport** | Public trust page (`/trust/[orgSlug]/[systemId]`), embeddable widget.js (auto-render badge), widget data API, v1 passport config CRUD, `PassportConfig` + `PassportAccessLog` models, `Organization.slug`, E2E tests | Evidence pack download, NDA/access-request gate, custom domains, white-label | Phase 2 evidence+NDA (**M**); Phase 4 custom domain+white-label (**L**) |
| **AI Supply Chain / AI-BOM** | `ai-bom.ts` (scan→BOM generator, CycloneDX 1.5 export, YAML export), `AiBom` + `AiBomComponent` models, v1 BOM CRUD + export API, E2E tests | Provider compliance registry, Art. 25 analysis, upstream change monitoring, manual BOM editor UI | Phase 2 registry (**L–XL**); Phase 3 contracts (**L**); Phase 4 monitoring (**L**) |

### Tier 2: Heavy lift (significant new infrastructure)

| Feature | What Exists | Key Gap | Estimated New Work |
|---------|-------------|---------|-------------------|
| **Multi-Regulation Graph** | EU AI Act classification engine, compliance scoring, assessment model | Multi-framework support (NIST, ISO, GDPR), cross-mapping engine, framework-aware schema | Regulatory knowledge base + schema refactor + new classification prompts |
| **Automated Evidence Collection** | GitHub scanner (integration pattern), ConformityAssessment.evidenceUrls | ML platform integrations (MLflow, W&B, etc.), OAuth token storage, background jobs | Adapter framework + 6-10 integrations + scheduling infrastructure |
| **Compliance Co-pilot** | Claude integration, classification logic, domain knowledge in skills | Chat UI, RAG pipeline, conversation state, streaming, EU AI Act text index | Vector DB + chat persistence + streaming route handlers |
| **Live Model Monitoring** | Incident model, audit logging, compliance scoring, v1 API | Inference logging, time-series storage, drift detection, monitoring SDK | Full telemetry pipeline + TSDB + statistical analysis + SDK |

## Strongest YC Narrative

Combine **#1 + #2 + #4**:

> "We're building the compliance infrastructure layer for AI. Developers integrate us in CI and their ML pipelines. Every AI system they ship becomes a trust page that sells ComplianceForge to their customers."

This creates:
- **Developer adoption** via CI/CD (bottom-up)
- **Revenue stickiness** via SDK integration (usage-based pricing)
- **Viral distribution** via Compliance Passports (organic growth)

**Post-audit assessment:** This narrative is now backed by shipped code. CI/CD has a working webhook + policy engine, the v1 API surface is complete with 14 endpoints, and the Compliance Passport has a live public trust page + embeddable widget. All three pillars of the YC narrative have working implementations.

## Existing Foundations (Audited)

Verified against the actual codebase — not aspirational.

| Feature | Verified Foundation | Accuracy |
|---------|-------------------|----------|
| CI/CD Integration | `policy-engine.ts`, `api/github/webhook`, `api/github/check-runs/[id]`, `GitHubInstallation` + `CiCheckRun` models, E2E tests | **Shipped (Phase 1)** — webhook + policy engine working |
| Compliance-as-Code SDK | Full v1 API (14 endpoints), `api-auth.ts`, `api-middleware.ts`, `cors.ts`, E2E tests | **Shipped (v1 API)** — client SDKs remaining |
| Multi-Regulation Graph | `claude.ts` classification, `Assessment` model, compliance scoring | Partial — EU AI Act only, no multi-framework schema |
| Compliance Passport | Public trust page, widget.js, passport data API, v1 passport config, `PassportConfig` + `PassportAccessLog` models, `Organization.slug`, E2E tests | **Shipped (Phase 1+3)** — evidence/NDA/custom domains remaining |
| Automated Evidence Collection | `github-scanner.ts` (integration pattern), `ConformityAssessment.evidenceUrls`, v1 evidence API (GET/POST) | Partial — evidence API exists, no adapter framework |
| Live Model Monitoring | `Incident` model, `AuditLog`, compliance scoring | Weak — no monitoring infrastructure |
| AI Supply Chain / AI-BOM | `ai-bom.ts` (generator + CycloneDX + YAML export), `AiBom` + `AiBomComponent` models, v1 BOM CRUD + export API, E2E tests | **Shipped (Phase 1)** — registry + monitoring remaining |
| Compliance Co-pilot | `claude.ts` (classification + doc gen), domain knowledge in skills | Partial — AI works, no conversational layer |

## Technical Stack Corrections

The following are documented in various feature files but important to note at the roadmap level:

| Documented (README/Architecture) | Actual (package.json/code) |
|----------------------------------|---------------------------|
| tRPC | Server actions + API route handlers |
| Clerk auth | NextAuth v4 + custom cf_auth cookie |
| Redis / Upstash | lru-cache (in-process) |
| BullMQ job queue | None (no background jobs) |
| TipTap rich text | Not in dependencies |
| React Flow | Not in dependencies |
| Vector DB / pgvector | Not in dependencies |

These gaps affect feature feasibility — especially monitoring (needs queue/TSDB), evidence collection (needs jobs), and co-pilot (needs vector search).

## Feature Details

Each feature has a dedicated design document in the [`features/`](features/) directory with:
- Strategic pitch and YC positioning
- Key capabilities and mock UX
- **Codebase audit** — what exists vs. what needs building
- **Technical specifications** — implementation details using the actual stack
- **Technical debt / corrections** — discrepancies between docs and code
- Implementation phases with effort estimates
- Revenue impact analysis
