# Feature: Compliance Passport (Public Trust Layer)

**Priority:** 4  
**Analogy:** Trust Center for AI  
**Status:** In Progress — Phase 1 (public page) and Phase 3 (widget) shipped

## The Pitch

Give every AI system a **public compliance passport**: a shareable page (and optional embed) that shows verified risk classification, compliance score, and high-level documentation status — so downstream customers and auditors can trust what you ship, and every deployment becomes organic distribution for ComplianceForge.

## Why It's YC-Worthy

Creates a viral loop: each customer publishes trust signals that reference ComplianceForge. Turns compliance from a back-office cost into a **go-to-market asset** (similar to SOC 2 trust pages, but native to AI governance).

## Key Capabilities (Target)

- **Public trust page** per organization + AI system (readable without login) — **shipped** at `/trust/[orgSlug]/[systemId]` when passport is enabled
- **Stable org URLs** via `Organization.slug`; system segment uses **system id** (UUID) today — optional `PassportConfig.customSlug` reserved for future vanity paths
- **Embeddable badge / mini-widget** for product marketing sites — **shipped** (`/api/passport/widget.js` + `[data-complianceforge]`)
- **Controlled disclosure**: org toggles visibility and field flags via **PassportConfig** and authenticated management API — **partially shipped** (`gatedFields` stored; trust page does not yet enforce granular field-level gates for every surface)
- **Evidence pack download** from the public surface (or token-gated), with access logging — **not shipped** (page views logged to `PassportAccessLog` only)

## Codebase Audit

ComplianceForge has a **public trust layer** for enabled passports (SSR page, JSON summary, embed script) plus an **authenticated v1 API** to manage configuration. Export packs remain the internal, session-authenticated path for full document download.

| Layer | What exists today | Gap |
|--------|-------------------|-----|
| **Data** | `PassportConfig` (per `aiSystemId`, `enabled`, `visibility`, `customSlug`, `brandColor`, show/hide flags, `gatedFields` JSON); `PassportAccessLog` (`passportConfigId`, `visitorIp`, `action`, `resourceAccessed`); `Organization.slug` (`@unique`) for trust URLs | No `PassportAccessToken` model yet; `customSlug` not wired into public routing; `gatedFields` not fully applied across public UI |
| **Public UI** | `src/app/(public)/layout.tsx` — minimal shell (no auth, no sidebar); `src/app/(public)/trust/[orgSlug]/[systemId]/page.tsx` — SSR, `generateMetadata` (OG/Twitter), dark UI (`bg-gray-950`), color-coded risk badges (minimal / limited / high / unacceptable), compliance score + grade (`getScoreGrade` / `getScoreStyle`), Annex IV section coverage bar, last assessment date, sector / deployment region / use case, `brandColor` accent CSS variable, “Powered by ComplianceForge” footer, **page-view** `PassportAccessLog` (best-effort, IP from `x-forwarded-for` / `x-real-ip`) | Evidence download, NDA / access-request flow, multi-system “trust center” index, custom-domain hosting |
| **Public API** | `GET /api/passport/[systemId]` — JSON: `systemName`, `orgName`, `riskTier`, `complianceScore`, `documentationStatus` as `X/17`, `lastAssessedAt`; **404** if passport disabled/missing; **CORS** `Access-Control-Allow-Origin: *`; `OPTIONS` preflight | Stricter abuse controls (dedicated rate limits / allowlists) if needed beyond current usage |
| **Widget** | `GET /api/passport/widget.js` — `Content-Type: application/javascript`, `Cache-Control: public, max-age=3600`; finds `[data-complianceforge]` nodes, fetches `/api/passport/{id}`, renders inline-styled pill (checkmark + “EU AI Act Compliant” + score); script size **under 3KB** (E2E asserts body length **under 5KB**) | iframe / shadow-DOM option for strict CSP; signed tokens if abuse appears |
| **Management API** | `GET` / `PATCH` `src/app/api/v1/systems/[id]/passport/route.ts` — API key auth, rate limit + CORS pattern consistent with v1; `GET` **upserts** default `PassportConfig` if missing; `PATCH` updates `enabled`, `showScore`, `showDocStatus`, `showRiskTier`, `showIncidents`, `brandColor`, `customSlug`, `visibility`, `gatedFields`; handles **P2002** unique conflict on `customSlug` | Admin UI coverage beyond settings smoke paths; token issuance for gated downloads |
| **Generation / export** | Annex IV flows + `src/lib/export-templates.ts` + `GET /api/export/[systemId]` | Public evidence path still must **not** reuse session export without a separate, explicit allow-list |
| **Tests** | `e2e/passport.spec.ts` — **9** tests: trust 404s, widget API 404, passport `OPTIONS` CORS, `widget.js` serves JavaScript under **5KB**, v1 passport `GET`/`PATCH` **401** without auth, v1 `OPTIONS` CORS, full-flow smoke (demo login → dashboard) | Deeper E2E for enabled passport happy path with seeded data |

**Conclusion:** Phase 1 (public page + schema + management API) and Phase 3 (public summary + widget) are **in production in code**; remaining work is **evidence/NDA**, **rate-limit hardening** if needed, and **Phase 4** distribution/branding features.

## Existing Foundation

Accurate relative to the current repo:

- **Stack:** Next.js (App Router), Prisma on PostgreSQL (e.g. Neon), NextAuth v4, Anthropic Claude SDK, Stripe, AgentMail; deployed on Vercel EU (`fra1`).
- **EU AI Act classification** with legal justification (assessments stored on `AiSystem`).
- **Compliance scoring (0–100)** in `src/lib/compliance-scoring.ts`, aligned with Annex IV and related signals (used on the public trust page for score + grade).
- **Annex IV documentation** stored per system in `Document` (sections 1–17, `type` / `section` / `content` / `status`, versioning fields); public page counts **substantive** sections (minimum content length) for `X/17` style status.
- **Compliance pack export:** `src/lib/export-templates.ts` + `src/app/api/export/[systemId]/route.ts` → HTML, PDF (Puppeteer), DOCX — **session-authenticated**, org-scoped.
- **Core models:** `AiSystem` includes `name`, `description`, `sector`, `useCase`, `deploymentRegion`, `riskTier`, `complianceStatus`, `complianceScore`, etc.; `Organization` includes `name`, optional **`slug`** (`@unique`), `plan`, and billing fields; `Document` links to `AiSystem` and author; **`PassportConfig`** / **`PassportAccessLog`** back the public passport feature.
- **Public passport surfaces:** `(public)` layout; trust page; `GET /api/passport/[systemId]`; `GET /api/passport/widget.js`; `GET`/`PATCH` `/api/v1/systems/[id]/passport`.

Still not built (or only stubbed in schema / API):

- Public **evidence pack** download and **access-request / NDA** gate (Phase 2).
- **Custom-domain CNAME**, **white-label** branding beyond accent color, **multi-system** org trust center pages (Phase 4).
- **Passport access tokens** for revocable share links (optional future model).
- No global `middleware.ts` auth gate; protection remains **per-route** — public passport routes intentionally avoid session-only helpers.

## Technical Specifications

### Public App Router routes (implemented)

- **`src/app/(public)/layout.tsx`** — Renders `children` only (no dashboard chrome).
- **`src/app/(public)/trust/[orgSlug]/[systemId]/page.tsx`** — Resolves org by `Organization.slug`, system by id + `organizationId`, requires `passportConfig.enabled`; otherwise **404**. Renders disclosure-safe summary (not full Annex IV body). **`generateMetadata`** for title, description, Open Graph, Twitter card, robots.

### Public HTTP APIs (implemented)

- **`GET /api/passport/[systemId]`** — Public JSON summary for widgets and integrations; CORS `*`; **`OPTIONS`** returns **204** with CORS headers.
- **`GET /api/passport/widget.js`** — Small IIFE script; discovers `[data-complianceforge="{systemId}"]`, fetches sibling API path; **inline styles only**; cached **1 hour**.

### Authenticated management API (implemented)

- **`GET /api/v1/systems/[id]/passport`** — Returns `PassportConfig` for the system in the API key’s org; creates default row if missing.
- **`PATCH /api/v1/systems/[id]/passport`** — Updates passport settings; handles **`customSlug`** uniqueness (**P2002**).

### Prisma models (implemented)

- **`Organization`:** `slug String? @unique` (trust URL segment).
- **`PassportConfig`:** `aiSystemId` **unique**, `enabled`, `visibility`, `customSlug` **unique**, `brandColor`, `showScore`, `showDocStatus`, `showRiskTier`, `showIncidents`, `gatedFields` (string, default `"[]"`).
- **`PassportAccessLog`:** `passportConfigId`, optional `visitorIp` / `visitorEmail`, `action`, optional `resourceAccessed`, `createdAt`.

### Evidence pack download (public or token-gated) — not implemented

- Reuse **`generateCompliancePackHtml`** (and optionally PDF/DOCX) with a **dedicated code path** that:
  - Does **not** use the current export route’s session assumption, **or**
  - Uses a new route e.g. `GET /api/public/evidence/[token]` that validates token + rate limits, then streams the same generation pipeline.
- Log each successful download (and optionally failed attempts) to `PassportAccessLog` (or extend actions beyond `page_view`).
- **Operations note:** PDF generation uses Puppeteer today; public, high-traffic download may need queueing, a dedicated worker, or HTML-only for anonymous users on serverless limits.

### Widget architecture (implemented baseline)

- **Hosted script:** `/api/passport/widget.js` on the same deployment; **Cache-Control: public, max-age=3600**.
- **Behavior:** `data-complianceforge` attribute holds **system id**; fetches **`/api/passport/{id}`** relative to script origin.
- **Security:** CORS `*` on summary API today; add allowlists or signed widget tokens if abuse becomes an issue; rate limiting on summary API at the edge if needed.

### Infrastructure

- Remains on **Vercel EU** unless customers require other regions; custom-domain work for customer passports is **Phase 4**, not implemented.

## Implementation Approach

### Phase 1: Schema + public trust page — **complete**

1. **`Organization.slug`**, **`PassportConfig`**, **`PassportAccessLog`** in Prisma; enablement and settings via v1 API (and product UI as applicable).
2. **`(public)/trust/[orgSlug]/[systemId]/page.tsx`** with safe field allow-list and **404** when passport disabled; dark marketing-quality layout, SEO metadata, access logging on view.
3. **`generateMetadata`** and basic SEO — **done**.

### Phase 2: Evidence pack + access logging / gating — **not started**

1. Token model (if needed) and issuance UI; public or token-gated download route reusing export templates.
2. **Access request workflow / NDA gate** for sensitive fields or downloads.
3. Extend **`PassportAccessLog`** usage beyond page views; optional admin/reporting view.

**Effort estimate:** ~1.5–2.5 engineering weeks (downloads + gating + UI; more if PDF scale-out is required).

### Phase 3: Public summary API + embeddable widget — **complete**

1. **`GET /api/passport/[systemId]`** with CORS and **OPTIONS** — **done**.
2. **`/api/passport/widget.js`** minimal bundle, caching headers — **done**.
3. Optional iframe fallback for strict CSP — **future**.

### Phase 4: Distribution and branding — **not started**

1. **Custom domain CNAME** support for customer passports.
2. **White-label** branding (beyond single accent color).
3. **Multi-system** org trust center pages.

**Effort estimate:** ~2–4 engineering weeks (routing, DNS verification, CMS-style trust index, branding assets).

## Technical Debt / Corrections

- **`docs/features/04-compliance-passport.md` was previously overwritten with unrelated TypeScript** (API route code). This document restores the feature spec and aligns it with the repo.
- **Field naming:** product copy sometimes says “purpose”; the schema uses **`useCase`** on `AiSystem` — passports should use the same naming in APIs and UI.
- **`Document` model:** includes `title`, `version`, `authorId` in addition to `section`, `content`, `type`, `status` — public views must not leak internal draft content unless explicitly published.
- **Auth model:** absence of global Next.js `middleware.ts` means every new public route must be reviewed so it never calls session-only helpers by mistake.
- **Export route coupling:** tying public downloads to the existing authenticated export handler risks accidental exposure; prefer a **separate** public handler with explicit allow-lists.
- **Puppeteer on serverless:** current PDF path may hit timeout/size limits under heavy anonymous traffic; plan HTML-first or async PDF for passports if needed.

## Revenue Impact

- Organic acquisition via shared trust links and embedded badges.
- Upsell lever: advanced disclosure, custom branding, or higher audit log retention on paid tiers.
- Aligns with roadmap narrative: **CI/CD + SDK + Passport** as developer adoption, stickiness, and distribution.
