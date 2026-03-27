# Feature: Automated Evidence Collection

**Priority:** 5  
**Analogy:** "Vanta Integrations for AI"  
**Status:** Early foundation — significant new development required  
**Effort estimate:** **XL** (many external integrations, credential lifecycle, scheduling, and mapping logic; expect multi-sprint / multi-person work)

## The Pitch

The hardest part of compliance isn't knowing what's required -- it's **gathering proof**. Automate evidence collection from the tools ML teams already use, reducing compliance work from weeks to hours.

## Why It's YC-Worthy

This is the Vanta playbook, proven at scale for SOC 2. Integration depth creates switching costs -- once evidence flows automatically, teams never go back to manual collection. This is what makes compliance platforms sticky.

## Key Capabilities

### ML Platform Integrations

**Training & Experiment Tracking**
- **MLflow** -- pull experiment runs, model metrics, hyperparameters, artifact lineage
- **Weights & Biases** -- import training curves, model performance dashboards, dataset versioning
- **Neptune.ai** -- extract experiment metadata, comparison reports
- **Comet ML** -- training run summaries, model registry entries

**Fairness & Bias Testing**
- **Fairlearn** -- import fairness metrics, disparity reports, mitigation results
- **AIF360** (IBM) -- bias detection results, debiasing reports
- **What-If Tool** (Google) -- fairness analysis exports
- **Aequitas** -- audit results, bias reports by protected group

**Model Registry & Cards**
- **Hugging Face** -- scrape model cards, dataset cards, evaluation results
- **TensorFlow Model Garden** -- extract model metadata
- **PyTorch Hub** -- model documentation and benchmarks
- **Custom model cards** -- parse YAML/markdown model card formats

**Infrastructure & Security**
- **AWS** -- SageMaker configs, S3 data residency, KMS encryption status, IAM policies
- **GCP** -- Vertex AI configs, BigQuery data locations, Cloud KMS
- **Azure** -- Azure ML configs, data residency, Key Vault usage
- **Kubernetes** -- deployment configs, resource isolation, network policies

### Evidence Mapping to Annex IV

*Target product behavior (illustrative)* — not current app capability:

```
Annex IV Section                 Evidence Sources              Target state
────────────────────────────────────────────────────────────────────────────
1. System Description            Model card, README            auto + manual
2. Risk Management               Internal docs                 partial auto
3. Data Governance               W&B dataset tracking          integration-dependent
4. Technical Documentation       MLflow experiments            integration-dependent
5. Testing & Validation          Fairlearn + MLflow metrics    integration-dependent
6. Human Oversight               (manual)                      mostly manual
7. Accuracy & Robustness         MLflow + custom tests         integration-dependent
8. Cybersecurity                 AWS config, K8s policies      integration-dependent
────────────────────────────────────────────────────────────────────────────
(Actual coverage will depend on which integrations are connected.)
```

### Evidence Freshness Tracking

- Track when evidence was last collected
- Alert when evidence is stale (e.g., bias tests older than 30 days)
- Scheduled re-collection on configurable cadence
- Version history of all collected evidence

*Infrastructure note:* freshness and schedules require a job runner or cron strategy (see Technical Specifications). **AgentMail** is available for notifications once staleness rules exist.

### Evidence Validation

- Verify evidence actually satisfies the requirement (not just present, but sufficient)
- Flag incomplete or weak evidence with improvement suggestions
- Cross-reference evidence across systems for consistency

## Codebase Audit

**What exists today**

- **`src/lib/github-scanner.ts`** -- end-to-end pattern: Octokit connects to GitHub, scans repos for ML-related artifacts (dependencies, model file extensions, env/config hints), normalizes output into `ScanFinding[]` / `RepositoryScanResult`, persisted via server actions.
- **`ScanResult` (Prisma)** -- stores `repository`, `branch`, `findings` (JSON string), `totalFindings`, `reviewRequired`, `status`, optional `aiSystemId`, org and user linkage. Rich fields like libraries or model paths live inside serialized `findings`, not separate columns.
- **Annex IV doc generator** -- produces all 17 documentation sections (product feature).
- **`Document` model** -- `section` (int), `content`, `type`, `status` aligns with Annex IV-shaped docs per system.
- **`ConformityAssessment`** -- includes `evidenceUrls` (stored as a string, conventionally a JSON-encoded list) for linking external proof.
- **Export compliance pack** -- bundles documents into downloadable packages.

**What does not exist yet**

- No first-party integrations for **MLflow, W&B, Fairlearn, AIF360**, or **AWS / GCP / Azure** beyond generic references in scanner heuristics (e.g. package name lists).
- **No dedicated OAuth / API credential store** for arbitrary third-party ML or cloud services. GitHub scanning uses a **user-supplied token at request time** (not modeled as a persisted integration connection). NextAuth `Account` rows hold **login** provider tokens, not extensible “connected apps” for compliance evidence.
- **No webhook ingestion routes** for external systems to push evidence updates.
- **No evidence freshness metadata** or scheduled re-collection in the database or workers.
- **No background job system** in dependencies (e.g. no BullMQ/Redis); scheduled or long-running collection must be designed explicitly (Vercel Cron, queue + worker, etc.).

**Conclusion:** The GitHub scanner proves the **adapter + normalize + persist** pattern in this codebase. Automated evidence collection at product scale is still **mostly greenfield**: many adapters, secure credential handling, mapping into `Document` / `ConformityAssessment`, and scheduling layers remain to be built.

**Major infrastructure gap:** absence of a **background job / cron** story for polling and staleness checks; without it, “continuous collection” stays manual or on-demand only.

## Existing Foundation

- **Stack context:** Next.js 15 App Router, Prisma (PostgreSQL/Neon), NextAuth v4, Anthropic SDK, Octokit, AgentMail for email notifications.
- **GitHub scanner** -- only production integration that pulls external ML-related evidence into `ScanResult`; import flow can create/link `AiSystem` from findings.
- **Annex IV doc generator** -- target structure for generated section content (17 sections).
- **`Document`** -- per–AI-system records with `section`, `type`, `content`, `status` suitable for merging or supplementing with auto-collected snippets.
- **`ConformityAssessment.evidenceUrls`** -- place to attach canonical URLs or deep links to collected artifacts (stored as string; parse as JSON array in app code if needed).
- **Export compliance pack** -- downstream packaging of documentation for submission.
- **Compliance scoring** -- can later incorporate evidence completeness once collection and mapping exist.

## Technical Specifications

### 1. Adapter interface (integration layer)

Define a small internal contract per provider, similar in spirit to `scanRepository` → `RepositoryScanResult`:

- **`collectEvidence(connection, context) -> NormalizedEvidenceBundle`**
  - `connection`: credentials reference (id) + provider id + org scope
  - `context`: `aiSystemId`, optional filters (project, experiment, region)
- **`listCapabilities()`** -- what artifact types the adapter can return (metrics, reports, URLs, blobs)
- **`healthCheck(connection)`** -- validate tokens before full runs

Adapters live behind a registry (e.g. map `provider` string → implementation) so UI and jobs stay provider-agnostic.

### 2. OAuth and API key storage (new schema)

NextAuth `Account` is not the right place for ML platform OAuth. Add something like:

- **`IntegrationConnection`** (or equivalent): `id`, `organizationId`, `provider` (enum/string), `displayName`, `createdByUserId`, `encryptedAccessToken`, `encryptedRefreshToken`, `expiresAt`, `scopes`, `metadata` (JSON), `status`, `lastSyncedAt`, `lastError`
- **Encryption at rest** for secrets (envelope with KMS or libsodium + env master key, per deployment docs)
- **API-key-only providers** -- same table with nullable OAuth fields and `apiKeyEncrypted` pattern, or separate `IntegrationApiKey` if rotation policies differ

Document threat model: org isolation, audit log on connect/disconnect, never log raw tokens.

### 3. Evidence normalization layer

Introduce a canonical intermediate type (e.g. `EvidenceItem`) before persistence:

- **Provenance:** provider, external id, fetched at, URL(s)
- **Classification:** type (`metric`, `report`, `config_snapshot`, `model_card`, …), tags
- **Annex mapping hints:** suggested section numbers (1–17), confidence
- **Payload:** summary text + optional JSON blob + optional blob storage pointer for large artifacts

All adapters map their native APIs into `EvidenceItem[]`. Downstream logic only consumes normalized items.

### 4. Mapping to `Document` and `ConformityAssessment`

- **`Document`:** For each Annex section, either append structured blocks to `content`, or create/update rows per `section` with `type` discriminating `manual` vs `auto_sourced`. Avoid silent overwrite: prefer version bump or a dedicated “auto” subsection with attribution and source URL in content.
- **`ConformityAssessment`:** Push stable, shareable URLs into `evidenceUrls` (maintain JSON array in app layer). Link items to requirement keys already stored in `requirements` JSON where applicable.
- **`ScanResult`:** Optionally generalize or add parallel models (`EvidenceCollectionRun`) so GitHub scans and ML-platform pulls share run metadata (`status`, timestamps, errors); avoid overloading `ScanResult` if semantics diverge.

### 5. Background jobs and scheduling

**Current state:** no BullMQ/Redis in the repo; work is request-scoped unless external cron is added.

**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Vercel Cron + route handlers** | Fits current hosting; minimal new infra | Time limits; cold starts; careful idempotency |
| **Managed queue (e.g. SQS + Lambda / Cloud Tasks)** | Durable, retries, long runs | More AWS/GCP coupling and setup |
| **BullMQ + Redis** | Familiar pattern for retries and dashboards | New infra cost and ops |
| **Trigger.dev / Inngest** (if adopted) | Good DX for workflows | New vendor and cost |

Recommendation for early iteration: **Vercel Cron** invoking a secured internal API route for **per-org staggered syncs**, with strict timeouts and chunked work; graduate to a queue if runs exceed platform limits.

### 6. Webhooks (future phase)

Dedicated routes (e.g. `/api/integrations/[provider]/webhook`) with signature verification, idempotency keys, and enqueue/processing consistent with the job strategy above.

## Technical Debt / Corrections

- **Doc vs reality:** Earlier versions implied high automatic coverage with per-section checkmarks; the app does **not** yet pull from MLflow/W&B/cloud for Annex IV. Tables and copy should stay labeled as **target** behavior until integrations ship.
- **`ConformityAssessment.evidenceUrls`:** Prisma type is `String` with default `"[]"`, not a native `String[]` -- treat as serialized JSON in application code for consistency.
- **`ScanResult` field names:** Persistence uses `repository` (not `repoName` / `repoUrl` split); URL can be reconstructed or stored inside `findings` if needed.
- **GitHub tokens:** Supplied per scan, not a stored “GitHub integration” entity -- productizing “connected GitHub” would align with the same `IntegrationConnection` design as other providers.
- **Staleness without jobs:** Alerting on stale evidence (via AgentMail) requires **last-collected timestamps** on evidence or runs and a **scheduler**; neither exists yet.

## Implementation Approach

### Phase 1: Core Integration Framework

1. Pluggable integration architecture (adapter pattern + registry)
2. OAuth/API key management and encrypted storage for connected services
3. Evidence normalization layer (different sources → unified `EvidenceItem`)
4. Evidence → Annex IV section mapping engine (writes into `Document` / `evidenceUrls` safely)

### Phase 2: ML Platform Integrations

1. MLflow integration (REST API + artifact store)
2. Weights & Biases integration (public API)
3. Hugging Face model card scraper
4. Fairlearn / AIF360 result importers (likely file/API hybrid depending on deployment)

### Phase 3: Cloud Infrastructure Integrations

1. AWS integration (SageMaker, S3, KMS via boto3)
2. GCP integration (Vertex AI, BigQuery via google-cloud SDK)
3. Azure integration (Azure ML, Key Vault via azure SDK)

### Phase 4: Continuous Collection

1. Webhook-based real-time evidence updates
2. Scheduled polling for sources without webhooks (cron or queue workers)
3. Evidence freshness dashboard and alerts (AgentMail for notifications)
4. Automated re-collection and staleness notifications

## Revenue Impact

- Integration depth creates massive switching costs
- Each connected integration = higher retention probability
- Premium integrations for enterprise tools (SageMaker, Vertex AI)
- Partner revenue potential with ML platform vendors
