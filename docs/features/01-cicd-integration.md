# Feature: Continuous Compliance in CI/CD

**Priority:** 1 -- Highest Impact
**Analogy:** "Snyk for AI Compliance"
**Status:** In Progress — Phase 1 core shipped

## The Pitch

Compliance isn't a one-time checkbox -- it breaks with every commit. Ship a **GitHub App / GitLab integration** that runs on every PR touching ML code.

## Why It's YC-Worthy

This is the "shift left" motion that turned Snyk into an $8B company. ComplianceForge already has the GitHub scanner -- this makes it **continuous** and **blocking**, not one-shot.

## Key Capabilities

### PR-Level Compliance Checks
- Block merges that introduce unregistered models
- Detect changes to risk profiles from code modifications
- Flag PRs lacking required documentation
- Configurable enforcement levels (block, warn, inform)

### `complianceforge.yml` Policy File
Repository-level policy configuration defining enforcement rules:

```yaml
# complianceforge.yml
version: 1
compliance:
  framework: eu-ai-act
  enforcement: blocking  # blocking | warning | informational

rules:
  require_registration: true
  require_documentation:
    - risk_assessment
    - human_oversight_plan
    - data_governance
  max_risk_tier_without_approval: limited
  auto_classify: true

ignore:
  paths:
    - "tests/**"
    - "notebooks/exploration/**"
  models:
    - "dev-*"

notifications:
  slack_channel: "#ai-compliance"
  email: compliance-team@company.com
```

### PR Status Checks
Visible status checks on pull requests:

```
✅ AI Compliance: No new models detected
⚠️ AI Compliance: 3 new models detected, 1 high-risk -- documentation required
❌ AI Compliance: Unregistered model deployment blocked -- register in ComplianceForge first
```

### Auto-Draft Documentation
Automatically generate Annex IV section drafts from code changes:
- Extract training configurations from code
- Parse dataset references and lineage
- Read model cards embedded in repositories
- Detect framework-specific metadata (PyTorch, TensorFlow, scikit-learn, HuggingFace)

## Existing Foundation

- **GitHub scanning (production code):** `src/lib/github-scanner.ts` uses Octokit to scan repos: ML library detection (Python + npm ecosystems, including TensorFlow, PyTorch, HuggingFace, OpenAI, scikit-learn, and many more), model file discovery (`.onnx`, `.pt`, `.h5`, `.pkl`, `.safetensors`, etc.), API-key/endpoint heuristics, and dependency tree analysis. Results persist via Prisma `ScanResult` (optional link to `AiSystem`).
- **UI-driven scan flow:** `scanRepoAction` and related helpers in `src/server/actions.ts` create `ScanResult` rows, audit logs, and paths to import findings into inventory.
- **Risk classification:** Assessments backed by `src/lib/claude.ts` (Anthropic); REST entry point at `api/v1/systems/[id]/classify` aligns with the product’s classifier UX and skills (`eu-ai-act-compliance-assessment`).
- **Documentation pipeline:** `Document` model, export routes, and the Annex IV / export skills (`annex-iv-doc-generator`, `export-compliance-pack`) support draft and pack generation -- today triggered from the app, not from a bot.
- **External integration surface:** `api/v1/systems`, incidents, classify routes plus `src/lib/api-auth.ts` (API keys on `Organization`) and `src/lib/api-middleware.ts` (rate limiting) establish patterns for machine-to-machine calls.
- **CI/CD — policy engine:** `src/lib/policy-engine.ts` implements a dependency-free YAML subset parser, `PolicyConfig` / `PolicyViolation` types, glob-based `ignore.paths` / `ignore.models`, and `evaluatePrCompliance()` (registration requirements, required documentation list, `max_risk_tier_without_approval` caps). `parsePolicyConfig()` accepts policy YAML stored on installations.
- **CI/CD — GitHub webhook:** `src/app/api/github/webhook/route.ts` verifies `X-Hub-Signature-256` with HMAC SHA-256, handles `installation` (created/deleted) and `pull_request` (`opened`, `synchronize`), resolves changed files (payload or GitHub API via installation access token when `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` are set), detects ML-related paths and model artifacts in the diff, runs policy evaluation when `policyConfig` is present, and upserts completed `CiCheckRun` rows with JSON `findings` and a `detailsUrl` pointing at the app.
- **CI/CD — check run API:** `src/app/api/github/check-runs/[id]/route.ts` exposes `GET` for a single run (404 when missing), including parsed `findings` and related `GitHubInstallation` metadata.
- **CI/CD — data model:** Prisma `GitHubInstallation` (`installationId`, `accountLogin`, `organizationId`, JSON-string `repositories`, optional `webhookSecret`, optional `policyConfig`, `enforcement`, `isActive`) and `CiCheckRun` (FK to installation row, `repository`, `prNumber`, `headSha`, `status`, `conclusion`, `modelsDetected`, `issuesFound`, JSON-string `findings`, `detailsUrl`, timestamps). **Production GitHub App registration** (github.com/apps) and **native GitHub Check Run / status UI** (API posts back to GitHub) are still manual/product steps, not fully wired for end-user “green check on PR” without further work.
- **Quality signal:** `e2e/cicd-integration.spec.ts` covers webhook presence and auth rejection, method guards, and check-runs behavior; full Playwright suite passes (30/30 at last audit).

## Codebase Audit

| Area | In codebase today | Still to build for CI/CD |
|------|-------------------|---------------------------|
| Repo analysis | Full-repo Octokit scanner + `ScanResult`; **PR-scoped** file lists via webhook + GitHub pulls API; ML / model-extension heuristics on changed paths | Deeper diff semantics (hunks), reuse of full `scanRepository` in one code path, optional queue for huge PRs |
| Policy | **`src/lib/policy-engine.ts`:** parse YAML, ignore globs, `evaluatePrCompliance()` against synthetic `ScanFinding`s from PR files; webhook uses `GitHubInstallation.policyConfig` when set | Auto-load `complianceforge.yml` from repo default branch; org defaults + multi-repo inheritance beyond stored install row |
| Inventory / gates | Policy engine can enforce registration and doc rules when findings carry enough context | Tighter `AiSystem` ↔ repo/branch mapping and live inventory queries inside webhook (today partly inferred via policy inputs) |
| Classification | Claude + `/api/v1/.../classify` | Policy flag `auto_classify` not yet driving PR-time classify with quotas / idempotency |
| GitHub automation | **Webhook** (`src/app/api/github/webhook/route.ts`): HMAC verification, install lifecycle, PR events, internal **`CiCheckRun`** persistence, **GET** `check-runs/[id]` | **Register** GitHub App for production; **POST** Checks API or commit status so results show on GitHub; **inline PR comments**; optional per-install secret use (`webhookSecret` column unused vs env `GITHUB_WEBHOOK_SECRET`) |
| Org ↔ GitHub | `GitHubInstallation` rows; install `created` resolves org by matching GitHub account login to `Organization.slug` or `name` | First-class “link installation to org” admin UX; avoid ambiguous name collisions |
| API shape | Webhook + check-run detail routes under `src/app/api/github/` | Public docs URL, optional internal job endpoints |
| Background work | Webhook completes work in the request (creates/updates `CiCheckRun` synchronously) | Durable queue or worker if timeouts or volume grow (no BullMQ/Redis in repo today) |
| GitLab / Bitbucket | N/A | Phase 4 — unchanged |

**Bottom line:** **Phase 1 core is in the repo:** webhook ingress, install + PR handling, internal check-run records, PR ML touch detection, and a **real policy engine**. Remaining gap is **product completion**: registering the GitHub App, **surfacing** results on GitHub’s UI, bot comments, repo-sourced policy sync, and then GitLab/Bitbucket — plus scale hardening if needed.

## Implementation Approach

### Phase 1: GitHub App — **L** (core shipped; finish **S–M**)
1. ~~Webhook route with verified payloads; installation + PR events~~ **Done** — `src/app/api/github/webhook/route.ts`
2. ~~On PR open/update, enumerate changed files and detect ML / model artifacts~~ **Done** (API-backed file list when App JWT env vars set)
3. ~~Persist per-PR outcomes for dashboards / links~~ **Done** — `CiCheckRun` + `GET /api/github/check-runs/[id]`
4. Register GitHub App in GitHub settings and configure production env (`GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, callback URL) — **S**
5. Post **native** GitHub Check Runs or commit status so developers see pass/fail on the PR — **M** (internal DB record exists; GitHub UI integration pending)
6. Inline review comments / annotations on touched lines — **M**
7. Harden org ↔ installation linking (admin flow, not only slug/name heuristic) — **S–M**

### Phase 2: Policy Engine — **M** (parser + evaluation shipped; extend **S–M**)
1. ~~Parse `complianceforge.yml`-style YAML and evaluate rules (registration, documentation, risk tier cap, ignores)~~ **Done** — `src/lib/policy-engine.ts`
2. ~~Evaluate PR findings against policy in webhook~~ **Done** when `GitHubInstallation.policyConfig` is populated
3. Fetch or sync policy from **repository root** on each PR / on install — **M** (today policy is stored on the installation row, not auto-pulled from the repo)
4. Org-level defaults + explicit repo overrides in product settings — **S–M**

### Phase 3: Auto-Documentation — **L** (not started)
1. Extract model metadata from code changes
2. Generate draft Annex IV sections (reuse `annex-iv-doc-generator` / Claude paths)
3. Open or update documentation PRs automatically

### Phase 4: GitLab + Bitbucket — **XL** (not started)
1. Extend to GitLab CI integration
2. Add Bitbucket Pipelines support

## Technical Specifications

**Stack (actual):** Next.js 15 App Router, Prisma + PostgreSQL (Neon-compatible), NextAuth v4, server actions in `src/server/actions.ts`, Route Handlers under `src/app/api/`, Anthropic SDK (`src/lib/claude.ts`), Stripe, AgentMail, Octokit (`src/lib/github-scanner.ts` for full-repo flows).

**Webhook ingress (implemented):** `POST src/app/api/github/webhook/route.ts` (`nodejs` runtime). Validates `x-hub-signature-256` with `GITHUB_WEBHOOK_SECRET` (global env). Parses `x-github-event`; handles `installation` and `pull_request`. Maps new installs to `Organization` via `slug` / `name` case-insensitive match on GitHub account login. Returns JSON responses (including `202` for ignored events).

**PR file resolution:** Prefer files on `pull_request` payload when present; otherwise `GET /repos/{owner}/{repo}/pulls/{number}/files` using an installation access token from `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` (JWT → installation token exchange in-route).

**Policy evaluation:** `parsePolicyConfig` + `evaluatePrCompliance` from `src/lib/policy-engine.ts` on `findingsFromPrFiles()`-built `ScanFinding[]` when `installation.policyConfig` is non-empty; installation `enforcement` (`blocking` | `warning` | default) feeds `resolveConclusion` for stored `CiCheckRun.conclusion`.

**Persistence:** `GitHubInstallation` (numeric GitHub `installationId` unique) and `CiCheckRun` (FK `installationId` → installation **row id** UUID, plus `repository`, `prNumber`, `headSha`, `status`, `conclusion`, counts, `findings` JSON string, `detailsUrl`). **Not** writing to `ScanResult` for PR events today — PR state is isolated on `CiCheckRun`.

**Check run API:** `GET src/app/api/github/check-runs/[id]/route.ts` returns run + installation subset; `404` for unknown UUID.

**Reuse scanning (next convergence):** Optional refactor to call shared helpers from `github-scanner.ts` / `scanRepository` for richer findings; today PR path uses filename heuristics only.

**Inventory checks:** Policy engine encodes registration/documentation/risk rules; wiring to live `AiSystem` queries for strict “registered vs not” remains a follow-up.

**Classification triggers:** When `auto_classify` should run on PR, call existing classification pipeline around `src/lib/claude.ts` with rate limits (`src/lib/api-middleware.ts` / `src/lib/rate-limit.ts` LRU) — not yet invoked from webhook.

**REST vs actions:** GitHub callbacks stay Route Handlers; dashboard remains server actions. Non-GitHub CI can still target `api/v1` with `ApiKey` (`src/lib/api-auth.ts`).

**Observability:** Prefer `AuditLog` for install/check events in future; webhook currently logs errors to console.

**Testing:** `e2e/cicd-integration.spec.ts` — webhook exists / rejects unauthenticated POST / rejects GET; check-runs `404` for missing UUID; route not `405` for invalid id shape.

## Demo Script (2-Minute YC Demo)

1. Show a PR adding a new credit scoring model
2. ComplianceForge bot comments: detects high-risk model, blocks merge
3. Developer clicks link, fills quick registration form
4. Documentation auto-generated, compliance check goes green
5. PR merges -- model is now tracked and compliant

## Revenue Impact

- Drives daily active usage (every PR = API call)
- Natural expansion within engineering orgs (one team adopts, others follow)
- Usage-based pricing per repository or per check

## Technical Debt / Corrections

- **README / ARCHITECTURE / SKILLS-INVENTORY** still describe **tRPC**, **Clerk**, **TipTap**, **React Flow**, **Redis/Upstash**, and **BullMQ**. The implemented app uses **NextAuth**, **server actions + Route Handlers**, and **in-memory LRU rate limiting** -- not those listed technologies. CI/CD docs and investor-facing architecture should be aligned to avoid planning integrations on non-existent layers.
- **Slack in `complianceforge.yml` sample:** no Slack integration verified in codebase; treat sample as forward-looking or back with AgentMail/other existing notification paths (`agentmail-notifications` skill).
- **Scaling:** High-volume PR fan-out may require moving scans off the webhook request thread and/or adopting a shared rate limiter; current limiter is process-local LRU, not Redis.
- **GitHub UI parity:** `CiCheckRun` is stored in Postgres and exposed via `GET /api/github/check-runs/[id]`; the GitHub Checks API / commit status API is **not** yet called, so the PR page does not automatically show ComplianceForge as a native check unless that layer is added.
- **Webhook secret:** Verification uses env `GITHUB_WEBHOOK_SECRET` only. Prisma `GitHubInstallation.webhookSecret` exists but is unused — either wire per-install secrets or drop the column to avoid confusion.
- **Org resolution on install:** Matching GitHub account login to `Organization.slug` / `name` is heuristic; production needs an explicit linking or onboarding flow.
- **Policy source of truth:** Policy YAML is applied from the string on `GitHubInstallation`, not automatically read from `complianceforge.yml` in the repo; docs and product should clarify until sync is built.
- **Previous doc drift:** Earlier versions suggested `src/app/api/integrations/github/webhook/route.ts` and claimed no webhook/parser — actual paths are `src/app/api/github/webhook/route.ts` and `src/lib/policy-engine.ts`.
