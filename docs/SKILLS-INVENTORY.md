# ComplianceForge — Full Skills Inventory

Complete mapping of every skill required to build, ship, and operate ComplianceForge,
with integration points to available Anthropic/Cursor skills.

---

## 1. AVAILABLE SKILL INTEGRATIONS (Already in ~/.cursor/skills)

### 1.0 Project custom skills (`.cursor/skills/`)

This repository ships **11** project-specific skills (invoke from Cursor when the task matches):

| Skill | Focus |
|-------|--------|
| `eu-ai-act-compliance-assessment` | Risk tier classification and legal justification |
| `annex-iv-doc-generator` | Annex IV technical documentation |
| `github-repo-scanner` | Repo scan for AI/ML usage and inventory |
| `compliance-calendar` | Deadlines and enforcement timeline |
| `compliance-scoring` | Compliance scores (0–100) and analytics |
| `export-compliance-pack` | HTML/PDF/DOCX export for submissions |
| `team-rbac` | Team roles and access control |
| `agentmail-notifications` | Compliance and transactional email |
| `stripe-billing` | Subscriptions, webhooks, plan enforcement |
| `public-rest-api` | Public REST API and API keys |
| `docs-feature-updater` | Docs and feature design sync with the codebase |

### 1.1 AgentMail Integration (`agentmail-integration`)
**Integration Points for ComplianceForge:**
- **Compliance Alert Emails**: Notify users when risk classifications change
- **Deadline Reminder Emails**: EU AI Act milestone notifications (Aug 2, 2026 enforcement)
- **Audit Report Delivery**: Email generated compliance reports as PDF attachments
- **Incident Notification**: Auto-email stakeholders on serious incident detection (Art. 62 — 15-day window)
- **Verification Emails**: User signup, password reset, 2FA for platform access
- **Welcome Onboarding**: Guided compliance onboarding email sequences
- **Regulatory Update Alerts**: Notify when EU AI Act amendments or guidance published
- **Team Assignment Notifications**: Alert team members when compliance tasks assigned

### 1.2 Identify Quality Resources (`identify-quality-resources`)
**Integration Points for ComplianceForge:**
- **EU AI Act Knowledge Base**: Curate authoritative resources on all 180 articles
- **Compliance Training Materials**: Build learning modules for platform users
- **Regulatory Update Monitoring**: Find and validate new guidance documents
- **NotebookLM Integration**: Build EU AI Act reference notebooks for AI-powered Q&A
- **Resource Tiering**: Apply the Tier 1/2/3 framework to compliance resources

### 1.3 Create Rule (`create-rule`)
**Integration Points for ComplianceForge:**
- **Project Coding Standards**: Enforce TypeScript strict mode, Server Actions + API route handler patterns, Prisma conventions
- **EU AI Act Data Patterns**: Rules for handling personal data (GDPR-aligned)
- **Security Rules**: Enforce auth checks, input validation, secret management
- **API Design Rules**: Consistent error handling, response formats, versioning

### 1.4 Create Skill (`create-skill`)
**Integration Points for ComplianceForge:**
- **Domain-Specific Skills**: Build compliance assessment, document generation, audit skills
- **Integration Skills**: GitHub scanner, Stripe billing, NextAuth v4 integration guides
- **Testing Skills**: Compliance validation, regression testing patterns

### 1.5 Create Subagent (`create-subagent`)
**Integration Points for ComplianceForge:**
- **Compliance Assessor Agent**: Specialized in EU AI Act risk classification
- **Document Generator Agent**: Annex IV technical documentation specialist
- **Audit Trail Agent**: Log analysis and compliance gap detection
- **Code Reviewer Agent**: Security and compliance-aware code review
- **Regulatory Researcher Agent**: EU AI Act article lookup and interpretation

### 1.6 Shell (`shell`)
**Integration Points for ComplianceForge:**
- **Database Migrations**: Prisma migrate commands
- **Deployment Scripts**: Vercel/Fly.io deployment automation
- **Testing**: Run test suites, linting, type checking
- **Docker**: Container build and orchestration

---

## 2. CUSTOM SKILLS TO CREATE (Project-Specific)

### 2.1 `eu-ai-act-compliance-assessment`
**Purpose**: Guide Claude through EU AI Act risk classification decisions
**Key Knowledge**:
- Article 5: Prohibited AI practices (social scoring, subliminal manipulation, etc.)
- Article 6 + Annex III: High-risk AI system classification criteria
- Article 52: Transparency obligations for limited-risk systems
- Risk tier decision tree with legal justification requirements
- Sector-specific classification guidance (healthcare, finance, law enforcement, education)
**Triggers**: Risk classification, system assessment, compliance check

### 2.2 `annex-iv-doc-generator`
**Purpose**: Generate EU AI Act-compliant technical documentation
**Key Knowledge**:
- Complete Annex IV structure (17 required sections)
- Section-by-section guidance with examples
- Data governance documentation (Article 10)
- Risk management documentation (Article 9)
- Human oversight documentation (Article 14)
- Template library with sector-specific variants
**Triggers**: Document generation, technical documentation, Annex IV

### 2.3 `conformity-assessment-wizard`
**Purpose**: Guide users through self-conformity assessment (Article 43)
**Key Knowledge**:
- Assessment methodology per Annex VI (internal control) and Annex VII (external audit)
- Evidence collection requirements
- Checklist generation by risk tier
- Gap analysis with remediation recommendations
**Triggers**: Conformity assessment, compliance audit, gap analysis

### 2.4 `incident-reporter`
**Purpose**: Handle serious incident detection and NCA notification
**Key Knowledge**:
- Article 62 requirements (15-day reporting window)
- Incident severity classification criteria
- National Competent Authority (NCA) notification templates per EU member state
- Root cause analysis frameworks for AI incidents
**Triggers**: Incident report, serious incident, NCA notification

### 2.5 `github-repo-scanner`
**Purpose**: Scan codebases for AI model usage and auto-populate inventory
**Key Knowledge**:
- Common AI/ML library signatures (TensorFlow, PyTorch, HuggingFace, OpenAI, Anthropic)
- Model file detection (.onnx, .pt, .h5, .pkl, .safetensors)
- API key and model endpoint detection
- Dependency tree analysis for transitive AI dependencies
**Triggers**: GitHub scan, repository analysis, AI discovery

### 2.6 `compliance-dashboard-builder`
**Purpose**: Build and maintain compliance analytics dashboards
**Key Knowledge**:
- KPI definitions (compliance score, risk distribution, document coverage)
- Recharts/D3 visualization patterns for compliance data
- Alert threshold configuration
- Executive summary generation
**Triggers**: Dashboard, analytics, compliance metrics

### 2.7 `docs-feature-updater`
**Purpose**: Audit and update ComplianceForge documentation and feature design docs against the actual codebase
**Key Knowledge**:
- Feature doc standard structure (10 required sections), status values, effort sizes, audit workflow
- Actual tech stack vs aspirational claims, Prisma models reference
**Triggers**: Updating docs, adding features, auditing feature status, syncing docs with code, roadmap updates
**Status**: Built — `.cursor/skills/docs-feature-updater/SKILL.md`

---

## 3. CUSTOM SUBAGENTS TO CREATE

### 3.1 `compliance-assessor`
**Role**: Risk classification specialist
**System Prompt Focus**: EU AI Act articles 5-6, Annex III, risk tier decision-making
**Auto-Triggers**: When users add or modify AI systems in inventory

### 3.2 `doc-generator`
**Role**: Technical documentation specialist
**System Prompt Focus**: Annex IV structure, Claude API for content generation
**Auto-Triggers**: When risk classification completes, when users request documents

### 3.3 `audit-agent`
**Role**: Audit trail and compliance gap analyst
**System Prompt Focus**: Article 12 logging, gap detection, remediation
**Auto-Triggers**: Proactive — periodically reviews compliance state

### 3.4 `security-reviewer`
**Role**: Security and data protection reviewer
**System Prompt Focus**: GDPR alignment, data handling, auth patterns
**Auto-Triggers**: Code changes touching auth, data models, API endpoints

---

## 4. FULL-STACK SKILL CATEGORIES

### Category A: Frontend Engineering
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Next.js App Router | Next.js 15, React 19, TypeScript | P0 |
| Component Library | shadcn/ui, Radix UI, Tailwind CSS 4 | P0 |
| State Management | Zustand / React Context + Server State (Server Actions + API routes) | P0 |
| Form Handling | React Hook Form + Zod validation | P0 |
| Data Visualization | Recharts, React Flow (risk workflows) | P1 |
| Rich Text Editing | TipTap editor for document editing | P1 |
| File Upload/Export | PDF generation (react-pdf), CSV/Excel export | P1 |
| Accessibility | WCAG 2.1 AA compliance | P1 |
| Internationalization | i18next — EU requires multi-language (24 official EU languages) | P2 |
| Real-time Updates | Server-Sent Events / WebSocket for team collaboration | P2 |

### Category B: Backend Engineering
| Skill | Technologies | Priority |
|-------|-------------|----------|
| API Design | Server Actions + Next.js API route handlers (REST where public); not tRPC in this codebase | P0 |
| Database Design | Prisma ORM + PostgreSQL (Neon serverless) | P0 |
| Authentication | NextAuth v4 (codebase); Clerk/enterprise SSO remains an optional integration path | P0 |
| Authorization | Role-based access (Admin, Compliance Officer, Auditor, Viewer) | P0 |
| Background Jobs | Webhooks + route handlers today; BullMQ + Redis optional at higher async volume | P1 |
| File Storage | AWS S3 / Cloudflare R2 for documents and attachments | P1 |
| Caching | `lru-cache` (codebase); Redis (e.g. Upstash) if distributed caching is added later | P1 |
| Rate Limiting | `lru-cache` / in-process patterns (codebase); Upstash Redis if distributed limits are needed | P1 |
| Webhooks | Inbound (GitHub, Stripe) and outbound (notifications) | P2 |
| API Versioning | v1/v2 versioned public API for enterprise customers | P2 |

**Implemented in codebase (Backend / API)** — map skills and reviews to these modules:

| Area | Location / surface | Notes |
|------|-------------------|--------|
| CI/CD integration | `policy-engine.ts`, GitHub (and related) webhook API routes | Policy checks tied to repo events |
| AI-BOM | `src/lib/ai-bom.ts`, systems BOM API routes under `api/v1/systems/.../bom/` | Software/AI bill of materials for systems |
| Compliance Passport | Public trust pages under `src/app/(public)/`, passport/widget API under `api/v1/systems/.../passport/` and `api/passport/` | Embeddable trust and passport flows |
| SDK / public API extensions | Gaps, score, documents, evidence endpoints under `api/v1/systems/[id]/` | Extends the public REST surface documented in `public-rest-api` skill |

### Category C: AI/ML Integration
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Claude API Integration | Anthropic SDK, prompt engineering for compliance | P0 |
| Risk Classification AI | Multi-step reasoning for Art. 5/6 classification | P0 |
| Document Generation AI | Structured output for Annex IV sections | P0 |
| Embeddings & RAG | pgvector / Pinecone + EU AI Act text embeddings | P1 |
| Semantic Search | Natural language querying of regulation text | P1 |
| Gap Analysis AI | Compare system metadata vs. regulatory requirements | P1 |
| Incident Classification | Severity scoring for Art. 62 incidents | P2 |
| Recommendation Engine | Prioritized remediation suggestions | P2 |
| Multi-Model Orchestration | Claude for reasoning, GPT for summarization, Gemini for classification | P3 |

### Category D: Data & Storage
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Schema Design | Prisma schema for AI systems, assessments, documents, audits | P0 |
| Migrations | Prisma Migrate for zero-downtime schema changes | P0 |
| Audit Logging | Immutable append-only audit log table design | P0 |
| Multi-tenancy | Organization-scoped data isolation | P1 |
| Data Export | GDPR data portability (JSON/CSV export) | P1 |
| Backup & Recovery | Automated backups with point-in-time recovery | P2 |
| Data Retention | 10-year retention policy for audit logs (Art. 12) | P2 |

### Category E: Security & Compliance
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Authentication Flows | Signup, login, MFA, SSO (SAML/OIDC) | P0 |
| RBAC | Role-based access control with permission matrices | P0 |
| Input Validation | Zod schemas for all API inputs | P0 |
| CSRF/XSS Protection | Next.js built-in + CSP headers | P0 |
| Secret Management | Environment variables, Doppler/Infisical | P0 |
| GDPR Compliance | Data processing agreements, consent management, right to erasure | P1 |
| SOC2 Controls | Access logging, change management, incident response | P2 |
| Penetration Testing | OWASP Top 10 coverage | P2 |
| Encryption | At-rest (AES-256) and in-transit (TLS 1.3) | P0 |

### Category F: DevOps & Infrastructure
| Skill | Technologies | Priority |
|-------|-------------|----------|
| CI/CD Pipeline | GitHub Actions — lint, test, type-check, deploy | P0 |
| Containerization | Docker + Docker Compose for local development | P1 |
| Deployment | Vercel (frontend) + Fly.io/Railway (backend services) | P0 |
| Monitoring | Sentry (errors), PostHog (analytics), Grafana (metrics) | P1 |
| Log Management | Structured logging with correlation IDs | P1 |
| EU Region Hosting | Vercel EU edge, Fly.io EU regions (GDPR requirement) | P1 |
| Auto-scaling | Serverless scaling for Claude API calls | P2 |
| Feature Flags | LaunchDarkly / Vercel Feature Flags for staged rollouts | P2 |

### Category G: Email & Notifications (AgentMail)
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Transactional Email | AgentMail SDK — verification, password reset | P0 |
| Compliance Alerts | Deadline approaching, risk change, assessment due | P1 |
| Report Delivery | PDF compliance reports via email | P1 |
| Incident Notifications | Urgent alerts for Art. 62 incidents | P1 |
| Digest Emails | Weekly compliance summary for stakeholders | P2 |
| Email Templates | Branded HTML templates with Jinja2/React Email | P1 |
| Webhook Processing | Inbound email handling for support/feedback | P3 |

### Category H: Billing & Monetization
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Subscription Management | Stripe Billing — plans, upgrades, downgrades | P1 |
| Usage Metering | Track AI system count, API calls, doc generations | P1 |
| Feature Gating | Plan-based feature access (free/starter/growth/enterprise) | P0 |
| Invoice Generation | Stripe invoices with EU VAT handling | P2 |
| Trial Management | 14-day free trial with upgrade prompts | P1 |

### Category I: Testing & Quality
| Skill | Technologies | Priority |
|-------|-------------|----------|
| Unit Testing | Vitest for component and utility tests | P0 |
| Integration Testing | Playwright for end-to-end workflows | P1 |
| API Testing | Route handler / Server Action tests, Supertest | P1 |
| AI Output Testing | Evaluation harness for Claude classification accuracy | P1 |
| Load Testing | k6 for API performance benchmarking | P2 |
| Visual Regression | Chromatic / Percy for UI consistency | P3 |

### Category J: Compliance Domain Knowledge
| Skill | Technologies | Priority |
|-------|-------------|----------|
| EU AI Act Full Text | All 180 articles, 13 annexes, 180 recitals embedded | P0 |
| Risk Classification Logic | Decision trees for Art. 5 (prohibited) and Art. 6 (high-risk) | P0 |
| Annex III Categories | 8 high-risk use case categories with sub-classifications | P0 |
| Annex IV Requirements | 17 technical documentation sections with guidance | P0 |
| Conformity Assessment | Annex VI (internal) and Annex VII (external) procedures | P1 |
| EU AI Office Guidance | Official guidelines and implementation recommendations | P1 |
| National Transposition | Member state-specific requirements and NCAs | P2 |
| ISO Standards Mapping | ISO 42001 (AI management) alignment | P2 |
| Sector-Specific Rules | Healthcare (MDR), Finance (DORA), Critical Infrastructure (NIS2) | P2 |

---

## 5. INTEGRATION MAP — Anthropic Skills × Product Features

```
┌────────────────────────────────────────────────────────────────────┐
│                    ANTHROPIC SKILL INTEGRATIONS                     │
├───────────────┬──────────────────────┬─────────────────────────────┤
│ Available     │ Product Feature      │ Integration Type             │
│ Skill         │                      │                              │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ agentmail     │ Compliance Alerts    │ Deadline + risk notifications │
│               │ Incident Reporter    │ Art. 62 urgent alerts        │
│               │ Report Delivery      │ PDF compliance reports       │
│               │ User Onboarding      │ Verification + welcome       │
│               │ Digest Emails        │ Weekly compliance summary    │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ identify-     │ Knowledge Base       │ Curate EU AI Act resources   │
│ quality-      │ Training Materials   │ User education modules       │
│ resources     │ Regulatory Updates   │ Monitor guidance changes     │
│               │ NotebookLM Library   │ AI-powered regulation Q&A   │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ create-rule   │ Coding Standards     │ TypeScript/React patterns    │
│               │ Security Rules       │ Auth, validation, secrets    │
│               │ Data Handling        │ GDPR-aligned data patterns   │
│               │ API Conventions      │ Server Actions, route handlers, error handling │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ create-skill  │ Compliance Skills    │ Risk assessment skill        │
│               │ Doc Gen Skills       │ Annex IV generation skill    │
│               │ Scanner Skills       │ GitHub AI detection skill    │
│               │ Audit Skills         │ Log analysis skill           │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ create-       │ Compliance Assessor  │ Auto risk classification     │
│ subagent      │ Doc Generator        │ Auto doc generation          │
│               │ Audit Agent          │ Proactive gap detection      │
│               │ Security Reviewer    │ Compliance-aware code review │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ shell         │ DB Migrations        │ Prisma migrate commands      │
│               │ Deployments          │ Vercel/Fly.io deploy         │
│               │ Testing              │ Run test suites              │
│               │ Docker               │ Container management         │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ update-       │ Dev Experience       │ Editor config for team       │
│ cursor-       │                      │                              │
│ settings      │                      │                              │
├───────────────┼──────────────────────┼─────────────────────────────┤
│ migrate-to-   │ Rule Cleanup         │ Convert old rules to skills  │
│ skills        │                      │                              │
└───────────────┴──────────────────────┴─────────────────────────────┘
```

---

## 6. SKILL DEPENDENCY GRAPH (Build Order)

```
Phase 1 (Foundation):
  create-rule → coding-standards.mdc
  create-rule → security-rules.mdc
  create-rule → api-conventions.mdc
  eu-ai-act-compliance-assessment (SKILL.md) ← Domain knowledge first

Phase 2 (Core Features):
  annex-iv-doc-generator (SKILL.md)
  github-repo-scanner (SKILL.md)
  compliance-dashboard-builder (SKILL.md)
  agentmail-integration → email templates

Phase 3 (Agents):
  create-subagent → compliance-assessor.md
  create-subagent → doc-generator.md
  create-subagent → audit-agent.md
  create-subagent → security-reviewer.md

Phase 4 (Advanced):
  conformity-assessment-wizard (SKILL.md)
  incident-reporter (SKILL.md)
  identify-quality-resources → EU AI Act knowledge base
```

---

## 7. TOTAL SKILL COUNT

| Category | Count | Status |
|----------|-------|--------|
| Available (Anthropic/Cursor built-in) | 8 | Ready to use |
| Project custom skills (`.cursor/skills/`) | 11 | Built in repository |
| Custom Skills to create | 6 | To be built |
| Custom Subagents to create | 4 | To be built |
| Cursor Rules to create | 4+ | To be built |
| Full-stack skill categories | 10 | Covers 80+ individual skills |
| **Total unique skills/capabilities** | **99+** | |

---

*This inventory is a living document. Update as new skills are identified or requirements evolve.*
