# Feature: Live Model Monitoring & Drift Alerting

**Priority:** 6  
**Analogy:** "Datadog for AI Compliance"  
**Status:** Proposed — minimal foundation in repo; **heavy lift** (ingestion, time-series, stats, jobs, SDK). See [Codebase Audit](#codebase-audit).

**Effort estimate:** **XL–XXL** (multi-quarter if built in-house to production quality). This is the most infrastructure-heavy product surface: it implies a full telemetry pipeline, not a thin UI layer.

## The Pitch

Connect to production AI systems and continuously verify that compliance claims remain true. Close the loop between "we assessed compliance" and "we maintain compliance."

## Why It's YC-Worthy

This is where the enterprise money is -- ongoing monitoring contracts, not one-time assessments. Recurring revenue anchor with high retention. Compliance without monitoring is a snapshot that decays from day one.

## Key Capabilities

### Lightweight Monitoring Agent/SDK
Hook into inference pipelines with minimal overhead:

```python
from complianceforge.monitor import ComplianceMonitor

monitor = ComplianceMonitor(
    system_id="fraud-detector-v3",
    api_key="cf_...",  # Bearer token; same family as org API keys today
    buffer_size=1000,       # batch predictions before sending
    flush_interval_s=60,    # send every 60 seconds
)

# Wrap inference calls
@monitor.track
def predict(features: dict) -> dict:
    prediction = model.predict(features)
    return {
        "decision": prediction,
        "confidence": prediction.confidence,
        "protected_attributes": {
            "age_group": features["age_group"],
            "gender": features["gender"],
        }
    }
```

### Bias Drift Detection
Continuously monitor fairness metrics across protected groups:
- Track demographic parity, equalized odds, predictive parity over time
- Alert when protected-group performance diverges beyond configurable thresholds
- Sliding window analysis (hourly, daily, weekly)
- Comparison against baseline metrics from training/validation

```
⚠️ Bias Drift Alert -- fraud-detector-v3
   Metric: Demographic Parity (gender)
   Baseline: 0.03 (March 2026)
   Current:  0.11 (7-day rolling)
   Threshold: 0.08
   Trend: Increasing over last 14 days
   Action: Review recommended within 72 hours
```

### Data Drift Monitoring
Flag when input distributions shift enough to invalidate the original risk assessment:
- Feature distribution monitoring (KL divergence, PSI, KS test)
- Detect concept drift via prediction confidence trends
- Correlation with upstream data pipeline changes
- Alert when drift exceeds thresholds that invalidate training assumptions

### Automated Incident Creation
When monitoring thresholds are breached, automatically:
- File an incident in ComplianceForge with full evidence
- Attach drift reports, affected time windows, and sample data
- Notify responsible team via configured channels (email, Slack, PagerDuty)
- Update compliance status on the system's Compliance Passport

### Human Oversight Dashboard (Art. 14)
Real-time view of AI decision patterns for Article 14 compliance:
- Decision distribution visualization
- Override rate tracking (human-in-the-loop metrics)
- Confidence distribution and edge case flagging
- Aggregate statistics for regulatory reporting

## Codebase Audit

**Stack (actual):** Next.js 15 App Router, Prisma on PostgreSQL/Neon, NextAuth v4, Anthropic Claude SDK, Stripe, AgentMail.

**What exists and matches the *shape* of monitoring (alerts → incidents → audit trail):**

- **`Incident` model** — `severity`, `description`, `status`, `occurredAt`, `detectedAt`, `reportedToNca`, `ncaReportDate`, plus title, root cause, remediation; ties to `AiSystem` and `reporter` (User). Suitable *target* for auto-created incidents once monitoring exists.
- **`AuditLog` model** — append-style records (`action`, `resource`, `resourceId`, `details`, optional `aiSystemId`). Pattern for provenance and state-change history; not inference telemetry.
- **`AiSystem`** — `riskTier`, `complianceStatus`, `complianceScore` — natural hooks to reflect monitoring-derived status once signals exist.
- **Compliance scoring** (`src/lib/compliance-scoring.ts`) — 0–100 score with criteria including incidents and post-market monitoring; *could* later ingest monitoring health as a criterion, but no live signal wired today.
- **AgentMail** — can deliver drift/incident notifications once events are produced server-side.
- **Public API v1** — `ApiKey` + `validateApiKey` (`src/lib/api-auth.ts`); routes under `src/app/api/v1/` (e.g. systems, incidents). **Natural extension point** for `POST` inference/metric batches authenticated with the same Bearer pattern.
- **Rate limiting** — LRU-cache, in-process (`withRateLimit` on v1 routes); adequate for moderate external POST volume per instance, not a substitute for a dedicated ingestion tier at scale.
- **Recharts** — present in `package.json`; dashboard charts already used (e.g. `dashboard/charts.tsx`) — viable for aggregate monitoring UI once data exists.

**What does *not* exist (gaps for this feature):**

- No **inference logging** tables, APIs, or retention policies.
- No **time-series** store — only Prisma/PostgreSQL; no TimescaleDB, InfluxDB, or columnar rollups in repo.
- No **statistical drift detection** in the Node runtime (no scipy/numpy-style stack; would be custom JS, WASM, or a sidecar/batch worker).
- No **monitoring SDK** (the Python snippet is aspirational).
- No **real-time dashboard transport** (no WebSocket/SSE layer for live streams).
- No **background job / scheduler** system for periodic rollups, PSI/KS jobs, or alert evaluation.

**Conclusion:** Incident + audit logging show how *outcomes* are recorded; **none of the ingestion, storage, or analysis pipeline for live model telemetry exists**. This feature is **the most infrastructure-heavy** item on the roadmap relative to current code.

## Existing Foundation

- **Compliance scoring engine** (`compliance-scoring.ts`) — static/DB-driven criteria today; can *conceptually* incorporate monitoring signals once defined (e.g. open drift alerts, stale baselines).
- **Incident model + v1 incidents API** — destination for automated incidents; fields support severity, lifecycle, and NCA-related flags (`reportedToNca`, `ncaReportDate`).
- **Audit logging** — provenance for app actions, not model I/O; useful for "who acknowledged alert / changed threshold."
- **AI system inventory** (`AiSystem`) — attach monitoring config and rollup state per system; already has `riskTier`, `complianceStatus`, `complianceScore`.
- **API key auth + v1 REST** — external systems can authenticate today; **v1 can be extended** with ingestion endpoints (see Technical Specifications).
- **AgentMail** — channel for email alerts (e.g. drift summaries) once server emits events.
- **Recharts** — charting for dashboards over **aggregated** metrics (polling or SSR); not "live" until data + optional SSE/polling strategy exist.
- **Rate limiting** — basic abuse protection on API routes; revisit for high-volume ingestion (separate limits, payload caps, optional async queue).

**Corrections vs. earlier doc wording:** There is no dedicated "Compliance Passport" entity named as such in schema; status lives on **`AiSystem`** and related compliance artifacts. "Real-time status updates from monitoring" are **not** implemented — only manual/assessment-driven updates today.

## Technical Specifications

### Ingestion API (extend v1)

- **Auth:** Reuse `Authorization: Bearer cf_...` and `validateApiKey`; scope keys or add a `scopes` / `permissions` field on `ApiKey` if separating "read" vs "ingest" is required.
- **Suggested routes (illustrative):**
  - `POST /api/v1/systems/{id}/inference-events` — batched events (timestamp, optional labels, prediction summary, confidence, hashed or bucketed protected attributes, trace id).
  - `POST /api/v1/systems/{id}/metrics` — pre-aggregated metrics from customer pipelines (alternative to raw events).
- **Contract:** JSON batches, max body size enforced; idempotency key header for retries; 202 + async processing optional if moving to a queue.
- **Validation:** Zod (or existing patterns in `src/types`) aligned with org ownership of `aiSystemId`.
- **Rate limits:** Stricter or separate bucket for ingestion; consider daily quota per org in DB.

### Time-series storage options

| Approach | Pros | Cons |
|----------|------|------|
| **TimescaleDB on Neon** | Single vendor for Postgres; hypertables for rollups; SQL analytics | Neon/extension availability and ops must be confirmed per plan; migration risk |
| **Separate TSDB** (e.g. Influx, ClickHouse cloud) | Purpose-built compression and downsampling | Second data store, sync/ETL, higher ops complexity |
| **Postgres-only (partitioned tables)** | No new infra; Prisma-friendly | Manual partitioning, retention jobs, performance ceiling at high cardinality |

**Recommendation for v0:** Start with **partitioned PostgreSQL tables** (or Neon + Timescale if enabled) for hourly/daily aggregates; avoid storing raw PII — prefer hashes, bins, or customer-supplied aggregates.

### Drift detection approach

- **Not in Node hot path for heavy math:** Options — (1) **batch worker** (separate Node script, Python microservice, or serverless) reading aggregates from TS tables; (2) **incremental** PSI/KS on rolled-up histograms only; (3) **external** "bring your own metrics" POST to skip raw stats in CF for v1.
- **Libraries:** Evaluate `simple-statistics`, WASM bindings, or a small Python sidecar for KS/PSI if accuracy/perf demands it.
- **Outputs:** Drift run records + threshold breaches → domain events → incidents + optional AgentMail.

### Monitoring SDK architecture

- **Languages:** Python first (ML adoption); thin HTTP client posting batches to v1; optional OpenTelemetry-style attributes later.
- **Client responsibilities:** Buffer, sample, redact PII, backoff, attach `system_id` resolved from CF inventory.
- **Server:** Validate org, enqueue or write aggregates, never trust client-computed "compliant" flags without server checks.

### Dashboard (App Router + Recharts)

- **Data access:** Server Components or route handlers querying **pre-aggregated** tables (last 24h / 7d / 30d) — avoid loading raw events in the browser.
- **Components:** Recharts line/area (metric over time), bar (distribution), reference lines for thresholds; reuse patterns from existing dashboard charts.
- **"Near real-time":** Short polling (e.g. 30–60s) or add **SSE** later; WebSockets only if product demands shared live sessions.

### Background processing

- **Gap:** No BullMQ / Inngest / cron in repo today. Needed for: scheduled drift jobs, rollup aggregation, alert deduplication, retention enforcement.
- **Neon-friendly:** Vercel cron + serverless functions, or a small worker service with DB polling.

## Implementation Approach

### Phase 1: Monitoring SDK
1. Python monitoring SDK with async batching
2. Inference logging with configurable sampling
3. Protected attribute tracking (with privacy controls)
4. Cloud-hosted ingestion endpoint

### Phase 2: Drift Detection Engine
1. Statistical tests for distribution drift (PSI, KS, KL divergence)
2. Bias metric computation across protected groups
3. Configurable threshold and alerting rules
4. Time-series storage for metric history

### Phase 3: Alerting & Incidents
1. Alert rule engine (thresholds, trends, anomalies)
2. Notification integrations (email, Slack, PagerDuty, webhooks)
3. Auto-incident creation in ComplianceForge
4. Compliance Passport status auto-update

### Phase 4: Human Oversight Dashboard
1. Real-time decision stream visualization
2. Override tracking and metrics
3. Aggregate reporting for regulatory submission
4. Configurable retention policies

## Revenue Impact

- Recurring monitoring revenue (usage-based or per-system monthly)
- Enterprise pricing for real-time dashboards and SLA-backed alerting
- High retention: once monitoring is in production, it stays
- Upsell from assessment-only plans to monitoring-included plans

## Technical Debt / Corrections

- **Doc vs. schema:** Earlier materials may assume fields like `reportedAt` / `ncaDeadline`; the implemented **`Incident`** uses `occurredAt`, `detectedAt`, `reportedToNca`, and `ncaReportDate`.
- **"Compliance Passport":** Treat as product language for **`AiSystem` + compliance artifacts**, not a separate monitored model in Prisma.
- **Python example API key:** Production keys today are `cf_` + random segment from `generateApiKey`, not necessarily `cf_live_...` — align SDK docs with actual prefix when shipping.
- **Slack/PagerDuty in Phase 3:** Email path is grounded in AgentMail; other channels are net-new integrations.
- **"Real-time" dashboard:** Requires explicit transport (polling/SSE/WebSocket) and TS data — stating "real-time" without that stack is misleading; prefer "near real-time" until built.
