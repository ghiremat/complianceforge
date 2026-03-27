# Feature: Compliance Co-pilot

**Priority:** 8  
**Analogy:** "AI Compliance Advisor"  
**Status:** Proposed — strong AI + domain foundation in code; **no conversational layer or RAG yet**. Building the co-pilot means adding chat UX, persistence, streaming, and (for regulation Q&A) retrieval — not flipping a switch on existing infra.

## The Pitch

Go beyond one-shot classification. Build an AI co-pilot that guides users through the entire compliance journey conversationally -- from initial assessment through remediation to ongoing maintenance.

## Why It's YC-Worthy

Transforms compliance from "tool" to "advisor." Higher engagement, higher willingness to pay. The RAG + agentic workflow is technically defensible, and the regulatory knowledge base creates a content moat.

## Key Capabilities

The scenarios below describe **target** product behavior. Today the app delivers **form-based** classification and document drafting, not multi-turn chat or corpus-grounded Q&A. See [Codebase Audit](#codebase-audit).

### Interactive Risk Assessment

Follow-up questions that drill into edge cases and gray areas:

```
Co-pilot: You've described a content recommendation system.
          Let me ask some follow-up questions to determine the
          correct risk classification.

Co-pilot: Does your system make recommendations that could
          materially influence a person's opinion on political
          topics or electoral choices?

User:     It recommends news articles based on reading history.

Co-pilot: That's an important distinction. Under Art. 5(1)(b),
          AI systems that exploit vulnerabilities or manipulate
          behavior are prohibited. However, content recommendation
          alone is typically classified as "limited risk" under
          Art. 50 (transparency obligations).

          Two more questions:
          1. Is the system used by a platform with >45M EU users?
             (This triggers additional GPAI obligations under
              the Digital Services Act interaction)
          2. Does the system profile users based on sensitive
             categories (political views, religion, ethnicity)?

User:     Yes to both.

Co-pilot: This changes the assessment significantly. With
          sensitive category profiling, this system likely falls
          under Annex III, Category 1 (biometric/emotion
          recognition) or Category 5 (access to services).

          Updated classification: HIGH-RISK
          Legal basis: Annex III, Category 5(d)

          I've updated your system's risk tier. Would you like
          me to generate a remediation plan for the 12 new
          requirements that apply?
```

### Remediation Planner

Given compliance gaps, generate a prioritized action plan:

```
Remediation Plan for "NewsRec System"
Risk Tier: High-Risk | Gaps: 12 | Estimated Total Effort: 47 hours

Priority  Action                         Effort  Deadline    Depends On
──────────────────────────────────────────────────────────────────────────
Critical  Human oversight mechanism       8h     2026-06-01  —
Critical  Bias testing (protected groups) 6h     2026-06-01  —
High      Data governance documentation   4h     2026-07-01  —
High      Transparency notice (Art. 50)   2h     2026-07-01  —
High      Risk management system          8h     2026-07-01  —
Medium    Technical documentation         6h     2026-09-01  Risk mgmt
Medium    Logging & traceability          4h     2026-09-01  —
Medium    Accuracy testing protocol       3h     2026-09-01  Bias testing
Low       Cybersecurity assessment        3h     2026-12-01  —
Low       Post-market monitoring plan     2h     2026-12-01  Monitoring
Low       Conformity assessment prep      1h     2027-02-01  All above
```

### Regulation Q&A

RAG-powered Q&A over the complete regulatory corpus:

- **EU AI Act** full text (articles + recitals)
- **GPAI Code of Practice** (General Purpose AI obligations)
- **EU Commission guidance documents** and FAQs
- **European AI Office** publications
- **Relevant case law** and enforcement actions (as they emerge)

```
User:     If I fine-tune an open-source model from Meta, am I
          a "provider" or "deployer" under the AI Act?

Co-pilot: Under Art. 25(1)(c), if you modify a general-purpose
          AI model in a way that changes its intended purpose,
          you become a "provider" with all associated obligations.

          Fine-tuning for a specific use case typically qualifies
          as a substantial modification. You would be considered
          a provider of the downstream system.

          However, if you use the model as-is for its intended
          purpose, you're a "deployer" with lighter obligations.

          Key reference: Article 25, Recital 97

          Want me to assess your specific fine-tuning scenario
          to determine your exact obligations?
```

### Gap-to-Fix Automation

Offer to draft compliance artifacts based on system details:

```
Co-pilot: You're missing a human oversight plan. Based on your
          system details, I can draft one that includes:

          1. Operator training requirements
          2. Override mechanisms for automated decisions
          3. Escalation procedures for edge cases
          4. Monitoring dashboard requirements
          5. Performance thresholds for human review triggers

          The draft will be pre-populated with details from
          your system registration. You'll review and customize
          before finalizing.

          [Generate Draft]  [Tell Me More]  [Skip for Now]
```

## Codebase Audit

**Stack (verified):** Next.js 15 App Router, Prisma ORM (PostgreSQL / Neon), NextAuth v4, `@anthropic-ai/sdk`, Stripe, AgentMail.

**Strong today**

- **`src/lib/claude.ts`** — `classifyRiskTier()` calls Claude with a **structured JSON** contract and an explicit multi-step legal sequence in the user prompt (Art. 5 → Art. 6 / Annex III → Art. 6(3) exceptions → Art. 50 → minimal). `generateDocumentSection()` supports **Annex IV–style** draft sections. Both use **non-streaming** `messages.create()` today.
- **`.cursor/skills/eu-ai-act-compliance-assessment/SKILL.md`** — Curated domain knowledge (Article 5 prohibitions, Annex III categories, sector guidance, decision trees). Ideal to **lift or mirror** into co-pilot system prompts and tool descriptions; not loaded automatically by the app at runtime.
- **`src/lib/compliance-scoring.ts`** — Gap identification for dashboards / remediation narratives.
- **Prisma `Assessment` model** — Persists `riskTier`, `confidence`, `justification`, `keyArticles` (JSON string), `requirements`, `recommendations`, `exceptionsConsidered`, `annexIiiCategory`, `complianceGaps`, `rawResponse`, tied to `AiSystem` and assessor.
- **Document pipeline** — Draft documentation aligned with Annex IV-style workflows already exists alongside classification.

**Missing for a true “co-pilot”**

- **No conversational UI** — Risk flow is **form-based**, not chat.
- **No RAG** — No vector store, no `pgvector`, no embeddings pipeline, no Pinecone (or similar); **EU AI Act full text is not embedded or indexed** for retrieval.
- **No multi-turn conversation state** — No `Chat` / `Message` (or equivalent) model in Prisma; no server-side thread persistence for co-pilot sessions.
- **No streaming** — Current Claude usage returns complete messages; **chat-grade UX** typically needs token streaming (Anthropic SDK supports it; App Router can expose `ReadableStream` from route handlers).

**Available but unused levers**

- Anthropic SDK: **streaming**, **tool use**, **structured outputs** (patterns compatible with the existing JSON classification shape).
- Next.js: **streaming responses** in Route Handlers for progressive UI updates.

## Existing Foundation

| Area | What exists | Co-pilot gap |
|------|-------------|--------------|
| Classification | Claude + fallback `mockClassifyRiskTier`; results stored on `Assessment` | Turn into **multi-turn** elicitation + optional **re-run** / diff when answers change |
| Legal depth | Prompt sequence + skill file (Cursor), not runtime RAG | **System prompt** + optional **retrieval** for citation-heavy Q&A |
| Gaps / scoring | `compliance-scoring.ts` | Surface in chat as **action cards** / suggested next steps |
| Docs | Annex IV section generation | Wire **“generate draft”** actions from chat to existing generators |
| Auth / tenancy | NextAuth, org-scoped data | New tables must respect **organizationId** / RBAC like the rest of the app |

## Technical Specifications

### Chat UI component architecture

- **Route:** e.g. `app/(dashboard)/.../copilot/page.tsx` (exact path should match existing layout patterns).
- **Client shell:** Message list (user / assistant), composer, optional **system context strip** (active `AiSystem`, current `Assessment` summary).
- **Streaming consumer:** `fetch` to a dedicated API route (or Server Action pattern if compatible with streaming) that returns a **UTF-8 stream**; append deltas to the active assistant message.
- **Actions:** Reuse existing buttons/patterns for “Run classification”, “Open Annex IV”, linking out to **forms** where full CRUD still lives — avoid duplicating entire flows inside chat on day one.

### Conversation persistence (Prisma)

Introduce models along these lines (names illustrative):

- **`CopilotConversation`** — `id`, `organizationId`, `userId`, `aiSystemId` (optional), `title`, `createdAt`, `updatedAt`.
- **`CopilotMessage`** — `id`, `conversationId`, `role` (`user` \| `assistant` \| `system`), `content` (text or JSON for tool calls), `metadata` (optional JSON: token usage, model id, retrieval citations).

Migrations, RLS-style checks at the app layer, and retention policy should align with existing `AuditLog` / privacy expectations.

### RAG architecture options

| Option | Pros | Cons |
|--------|------|------|
| **pgvector on Neon** | Single database; Prisma-friendly with extensions; simpler ops | Index tuning, chunking, and migration discipline; DB load |
| **External vector DB** (e.g. Pinecone, Weaviate, pgvector elsewhere) | Isolates search load; scalable | Extra service, sync, and secrets; latency + consistency story |

**Shared needs (hardest work):** chunking strategy, metadata (article / recital / source), embedding model choice, re-ingest on corpus updates, **citation** formatting in prompts, evaluation set for legal accuracy.

### Claude streaming integration

- Use SDK **streaming** APIs (e.g. message stream) from a **Route Handler** (`export async function POST`).
- Accumulate text blocks server-side if tools are interleaved; flush text deltas to the client stream.
- **Structured “final classification”** can remain a **non-streamed** tool call or second request to preserve valid JSON, while **narration** streams — mirrors today’s `RiskClassificationResult` contract.

### Leveraging existing classification in conversational flow

- **Tool or internal step:** “propose_classification” that gathers slot-filled `SystemMetadata` + conversation notes and calls **`classifyRiskTier`** (or a shared internal function), then writes/updates **`Assessment`**.
- **Follow-ups:** Model asks clarifying questions until required slots are filled; only then persist a new assessment row or version (product decision: append-only vs. update latest).
- **Compliance score:** After classification, call **`compliance-scoring`** logic and inject gap summary into the assistant context for remediation suggestions.

### System prompt design (skill-aligned)

- **Base layer:** Condense rules from `eu-ai-act-compliance-assessment` (prohibited practices, Annex III categories, transparency, exceptions) into a **single system prompt** or **prompt modules** versioned in repo.
- **Safety:** Disclaimers that output is **not legal advice**; encourage human review for high-risk decisions.
- **RAG branch:** When retrieval is enabled, inject only **retrieved chunks + source IDs**; instruct the model to cite those sources and abstain when context is insufficient.

### Effort estimates (T-shirt)

| Workstream | Size | Notes |
|------------|------|--------|
| Chat UI + streaming endpoint | **L** | Well-trodden patterns; must match design system |
| Prisma models + APIs + RBAC | **L** | Straightforward if scoped to copilot only |
| Prompt + tool wiring to `classifyRiskTier` / scoring | **M–L** | Reuse beats rewrite |
| **RAG pipeline + ingestion + citations + QA** | **XL** | Highest risk, validation, and maintenance cost |
| Remediation planner UX + persistence | **L–XL** | Depends on how much is “LLM prose” vs. structured tasks |

**Overall:** **L–XL** for a credible v1; **RAG** is the hardest and most compliance-sensitive slice.

## Implementation Approach

Phases align with dependencies surfaced in the audit:

### Phase 1: RAG Knowledge Base

1. Ingest EU AI Act full text + recitals (structured by article)
2. Add GPAI Code of Practice, Commission guidance
3. Build vector index with legal-domain embeddings
4. Implement retrieval pipeline with citation support

**Prerequisite honesty:** None of this exists in-repo today; this phase is **greenfield**.

### Phase 2: Interactive Assessment

1. Multi-turn conversation flow for risk classification
2. Context-aware follow-up question generation
3. Edge case detection and clarification prompts
4. Classification confidence scoring with human review triggers

**Build on:** `classifyRiskTier` + `Assessment` + skill-derived prompts; add **conversation** + **streaming**.

### Phase 3: Remediation Planning

1. Gap → action mapping engine
2. Effort estimation model (based on system complexity)
3. Deadline calculation from regulatory timeline
4. Dependency-aware prioritization

**Build on:** `compliance-scoring.ts` and calendar/deadline features where applicable.

### Phase 4: Document Generation

1. AI-drafted compliance artifacts from system metadata
2. Template-guided generation (human oversight plans, DPIA, etc.)
3. Review and approval workflow
4. Version tracking and change history

**Build on:** Existing Annex IV section generation; extend with **chat-triggered** actions and versioning in `Document` if not already complete.

## Technical Debt / Corrections

- **“Risk classification engine”** as a separate service: in practice, logic lives in **`src/lib/claude.ts`** (+ mock fallback), not a standalone engine package. Co-pilot should **call shared lib code**, not fork prompts.
- **Assessment fields:** Stored as **`keyArticles`** (JSON string in DB), not a column named `articles`.
- **Regulation Q&A samples** in this doc imply **grounded** answers; without RAG, the model is **not** citing an indexed corpus — any co-pilot ship plan must **label** mode (general reasoning vs. retrieved citations).
- **Streaming:** Adding chat without streaming is possible but **weak UX**; plan for streams early to avoid retrofitting every consumer.
- **Skill file vs. product:** The EU AI Act skill is **developer-facing**; product prompts should be **duplicated or generated** from a canonical source in `src/` or a content repo so runtime behavior does not depend on Cursor skills.

## Revenue Impact

- Higher engagement: conversational UX drives daily usage
- Higher willingness to pay: "advisor" > "tool" in perceived value
- Reduces need for external compliance consultants ($500-1000/hr)
- Premium feature for higher-tier plans
- Technically defensible: RAG + regulatory knowledge base + agentic workflows
