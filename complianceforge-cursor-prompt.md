# ComplianceForge.ai — Full Build Cursor Prompt
## EU AI Act Compliance Platform v2.0 + AgentMail Integration

> **BuildwithAiGiri Series** — by Girish B. Hiremath | intelliforge.digital

---

## Overview

ComplianceForge.ai is an EU AI Act compliance SaaS platform for SMBs and startups who cannot afford enterprise-level consultants or auditing firms.

**Existing features:** GitHub repo scanner, Gemini AI risk classification, compliance certificates, deadline alerts, 113 article tracking.

**This prompt adds:** 10 full compliance modules, GPAI track, incident reporting, compliance score engine, Claude-powered document generation, and AgentMail agent-native email layer.

---

## Tech Stack (enforce strictly)

- **Framework:** Next.js 14 App Router
- **ORM:** Prisma
- **Database:** Supabase (PostgreSQL)
- **Auth:** Clerk
- **Payments:** Stripe (EUR, monthly subscriptions)
- **UI:** Tailwind CSS + shadcn/ui
- **AI:** Google Gemini (classification) + Claude API `claude-sonnet-4-20250514` (document generation)
- **Email:** AgentMail (agent-native two-way email)
- **File Storage:** Supabase Storage (PDF exports)
- **Deployment:** Vercel
- **Language:** TypeScript throughout

---

## Database Schema (Prisma)

### Organization & Multi-Tenancy

```prisma
model Organization {
  id              String   @id @default(cuid())
  name            String
  clerkOrgId      String   @unique
  plan            Plan     @default(STARTER)
  country         String?
  vatNumber       String?
  createdAt       DateTime @default(now())

  aiSystems       AISystem[]
  assessments     RiskAssessment[]
  documents       ComplianceDocument[]
  incidents       IncidentReport[]
  gpaiProfiles    GPAIProfile[]
  auditLogs       AuditLog[]
  agentMailInbox  AgentMailInbox?
}

enum Plan {
  STARTER     // €49/mo - up to 3 AI systems
  GROWTH      // €149/mo - up to 15 AI systems
  ENTERPRISE  // €499/mo - unlimited
}
```

### Core: AI System Registry

```prisma
model AISystem {
  id                  String        @id @default(cuid())
  orgId               String
  name                String
  description         String
  version             String?
  systemType          SystemType
  riskLevel           RiskLevel     @default(UNASSESSED)
  intendedPurpose     String
  deploymentContext   String
  isDeployer          Boolean       @default(false)
  isProvider          Boolean       @default(true)
  githubRepo          String?
  lastScannedAt       DateTime?
  classifiedAt        DateTime?
  classifiedBy        String?

  organization        Organization  @relation(fields: [orgId], references: [id])
  riskAssessments     RiskAssessment[]
  technicalDocs       TechnicalDocumentation[]
  riskManagementPlan  RiskManagementPlan?
  humanOversightPlan  HumanOversightPlan?
  dataGovernance      DataGovernancePlan?
  qmsRecord           QualityManagementSystem?
  postMarketPlan      PostMarketMonitoringPlan?
  incidentReports     IncidentReport[]
  conformityRecord    ConformityAssessment?
  euDbRegistration    EUDatabaseRegistration?
  auditLogs           AuditLog[]
  complianceScore     Int           @default(0)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}

enum SystemType {
  GPAI
  HIGH_RISK
  LIMITED_RISK
  MINIMAL_RISK
  PROHIBITED
  UNASSESSED
}

enum RiskLevel {
  UNACCEPTABLE
  HIGH
  LIMITED
  MINIMAL
  UNASSESSED
}
```

### Module 1: Risk Management System (Art. 9)

```prisma
model RiskManagementPlan {
  id                    String    @id @default(cuid())
  aiSystemId            String    @unique
  lifecycleStage        String
  identifiedRisks       Json
  residualRisks         Json
  testingMeasures       String
  reviewFrequency       String
  lastReviewedAt        DateTime?
  nextReviewDue         DateTime?
  approvedBy            String?
  status                DocStatus @default(DRAFT)
  aiGenerated           Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  aiSystem              AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 2: Technical Documentation (Art. 11 + Annex IV)

```prisma
model TechnicalDocumentation {
  id                        String    @id @default(cuid())
  aiSystemId                String
  version                   String    @default("1.0")
  generalDescription        String?
  elementsAndDevelopment    String?
  monitoringLogging         String?
  dataRequirements          String?
  humanOversightMeasures    String?
  accuracyMetrics           String?
  technicalRobustness       String?
  priorArtDescription       String?
  pdfUrl                    String?
  status                    DocStatus @default(DRAFT)
  aiGenerated               Boolean   @default(false)
  generatedAt               DateTime?
  approvedAt                DateTime?
  approvedBy                String?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  aiSystem                  AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 3: Data Governance (Art. 10)

```prisma
model DataGovernancePlan {
  id                      String    @id @default(cuid())
  aiSystemId              String    @unique
  trainingDataSources     Json
  dataCategories          Json
  biasAssessmentDone      Boolean   @default(false)
  biasAssessmentNotes     String?
  representativenessCheck Boolean   @default(false)
  dataQualityMeasures     String?
  labellingProcess        String?
  dataRetentionPolicy     String?
  gdprAlignment           Boolean   @default(false)
  dataProtectionOfficer   String?
  status                  DocStatus @default(DRAFT)
  aiGenerated             Boolean   @default(false)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  aiSystem                AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 4: Human Oversight (Art. 14)

```prisma
model HumanOversightPlan {
  id                          String    @id @default(cuid())
  aiSystemId                  String    @unique
  oversightMechanism          String
  overrideCapability          Boolean   @default(false)
  monitoringInterface         String?
  responsiblePersonRole       String?
  trainingForOperators        Boolean   @default(false)
  trainingDescription         String?
  situationalAwarenessTools   String?
  humanInterventionTriggers   Json?
  status                      DocStatus @default(DRAFT)
  aiGenerated                 Boolean   @default(false)
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt

  aiSystem                    AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 5: Quality Management System (Art. 17)

```prisma
model QualityManagementSystem {
  id                      String    @id @default(cuid())
  aiSystemId              String    @unique
  complianceStrategy      String?
  designProcessDesc       String?
  devMethodologies        String?
  testingValidation       String?
  changeManagement        String?
  postMarketFeedback      String?
  responsiblePersons      Json?
  supplierOversight       String?
  documentControl         String?
  internalAuditSchedule  String?
  status                  DocStatus @default(DRAFT)
  aiGenerated             Boolean   @default(false)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  aiSystem                AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 6: Post-Market Monitoring (Art. 72)

```prisma
model PostMarketMonitoringPlan {
  id                        String    @id @default(cuid())
  aiSystemId                String    @unique
  monitoringObjectives      String?
  kpis                      Json?
  dataCollectionMethod      String?
  feedbackChannels          String?
  reviewCadence             String?
  correctiveActionProcess   String?
  stakeholderReporting      String?
  status                    DocStatus @default(DRAFT)
  aiGenerated               Boolean   @default(false)
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  aiSystem                  AISystem  @relation(fields: [aiSystemId], references: [id])
}
```

### Module 7: Incident Reporting (Art. 73)

```prisma
model IncidentReport {
  id                    String          @id @default(cuid())
  orgId                 String
  aiSystemId            String
  title                 String
  incidentDate          DateTime
  description           String
  severity              IncidentSeverity
  affectedPersons       Int?
  rootCause             String?
  correctiveActions     String?
  reportedToAuthority   Boolean         @default(false)
  authorityReportDate   DateTime?
  authorityRefNumber    String?
  status                IncidentStatus  @default(OPEN)
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  organization          Organization    @relation(fields: [orgId], references: [id])
  aiSystem              AISystem        @relation(fields: [aiSystemId], references: [id])
}

enum IncidentSeverity { CRITICAL HIGH MEDIUM LOW }
enum IncidentStatus   { OPEN INVESTIGATING RESOLVED REPORTED_TO_AUTHORITY }
```

### Module 8: GPAI Compliance (Chapter V)

```prisma
model GPAIProfile {
  id                        String    @id @default(cuid())
  orgId                     String
  modelName                 String
  modelVersion              String?
  isOpenSource              Boolean   @default(false)
  computeFlops              Float?
  isSystemicRisk            Boolean   @default(false)
  technicalDocumentation    String?
  downstreamInstructions    String?
  copyrightPolicyUrl        String?
  trainingDataSummary       String?
  adversarialTestingDone    Boolean   @default(false)
  adversarialTestingNotes   String?
  systemicRiskMitigation    String?
  cybersecurityMeasures     String?
  codeOfPracticeAdherence   Boolean   @default(false)
  notifiedCommission        Boolean   @default(false)
  notificationDate          DateTime?
  status                    DocStatus @default(DRAFT)
  aiGenerated               Boolean   @default(false)
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  organization              Organization @relation(fields: [orgId], references: [id])
}
```

### Module 9: Conformity Assessment (Art. 43–49)

```prisma
model ConformityAssessment {
  id                      String              @id @default(cuid())
  aiSystemId              String              @unique
  assessmentType          AssessmentType
  notifiedBodyName        String?
  notifiedBodyId          String?
  assessmentStartDate     DateTime?
  assessmentEndDate       DateTime?
  outcomeStatus           AssessmentOutcome?
  certificateNumber       String?
  certificateExpiry       DateTime?
  declarationOfConformity Boolean             @default(false)
  ceMarkingApplied        Boolean             @default(false)
  euDbRegistered          Boolean             @default(false)
  notes                   String?
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  aiSystem                AISystem            @relation(fields: [aiSystemId], references: [id])
  euDbRegistration        EUDatabaseRegistration?
}

enum AssessmentType    { SELF_ASSESSMENT THIRD_PARTY }
enum AssessmentOutcome { PASSED FAILED PENDING CONDITIONAL }
```

### Module 10: EU Database Registration (Art. 71)

```prisma
model EUDatabaseRegistration {
  id                      String              @id @default(cuid())
  aiSystemId              String              @unique
  conformityAssessmentId  String?             @unique
  registrationNumber      String?
  registrationDate        DateTime?
  euDbUrl                 String?
  status                  RegistrationStatus  @default(NOT_REGISTERED)
  reminderSentAt          DateTime?
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  aiSystem                AISystem            @relation(fields: [aiSystemId], references: [id])
  conformityAssessment    ConformityAssessment? @relation(fields: [conformityAssessmentId], references: [id])
}

enum RegistrationStatus { NOT_REGISTERED PENDING REGISTERED EXPIRED }
```

### AgentMail Inbox

```prisma
model AgentMailInbox {
  id              String        @id @default(cuid())
  orgId           String        @unique
  inboxUsername   String        @unique
  inboxEmail      String        @unique
  agentMailId     String        @unique
  createdAt       DateTime      @default(now())

  organization    Organization  @relation(fields: [orgId], references: [id])
  threads         EmailThread[]
}

model EmailThread {
  id                  String         @id @default(cuid())
  inboxId             String
  agentMailThreadId   String         @unique
  subject             String
  threadType          ThreadType
  aiSystemId          String?
  incidentId          String?
  lastMessageAt       DateTime?
  status              ThreadStatus   @default(OPEN)
  createdAt           DateTime       @default(now())

  inbox               AgentMailInbox @relation(fields: [inboxId], references: [id])
}

enum ThreadType {
  DEADLINE_ALERT
  INCIDENT_REPORT
  AUTHORITY_COMMUNICATION
  DOCUMENT_REVIEW
  TEAM_NOTIFICATION
  INBOUND_QUERY
}

enum ThreadStatus { OPEN AWAITING_REPLY RESOLVED ESCALATED }
```

### Shared Enums & Audit

```prisma
enum DocStatus { DRAFT IN_REVIEW APPROVED EXPIRED }

model AuditLog {
  id          String   @id @default(cuid())
  orgId       String
  aiSystemId  String?
  userId      String
  action      String
  module      String
  before      Json?
  after       Json?
  createdAt   DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id])
  aiSystem     AISystem?    @relation(fields: [aiSystemId], references: [id])
}
```

---

## App Router Structure

```
app/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
├── (dashboard)/
│   ├── layout.tsx                        # Sidebar + org switcher
│   ├── page.tsx                          # Compliance Score Dashboard
│   ├── systems/
│   │   ├── page.tsx                      # AI System Registry list
│   │   ├── new/page.tsx                  # Register new AI system
│   │   └── [systemId]/
│   │       ├── page.tsx                  # System overview + compliance score
│   │       ├── risk-management/page.tsx
│   │       ├── technical-docs/page.tsx
│   │       ├── data-governance/page.tsx
│   │       ├── human-oversight/page.tsx
│   │       ├── qms/page.tsx
│   │       ├── post-market/page.tsx
│   │       ├── incidents/page.tsx
│   │       ├── conformity/page.tsx
│   │       └── eu-registration/page.tsx
│   ├── gpai/
│   │   ├── page.tsx
│   │   └── [gpaiId]/page.tsx
│   ├── scanner/page.tsx
│   ├── incidents/page.tsx
│   ├── inbox/page.tsx                    # AgentMail thread viewer
│   ├── certificates/page.tsx
│   ├── deadline-tracker/page.tsx
│   └── settings/
│       ├── page.tsx                      # Shows org inbox address
│       ├── billing/page.tsx
│       └── team/page.tsx
├── api/
│   ├── webhooks/
│   │   ├── clerk/route.ts                # Creates AgentMail inbox on org signup
│   │   ├── stripe/route.ts
│   │   └── agentmail/route.ts            # Processes inbound emails
│   ├── ai/
│   │   ├── classify/route.ts             # Gemini risk classification
│   │   ├── generate-doc/route.ts         # Claude document generation
│   │   └── scan-repo/route.ts            # GitHub scanner
│   ├── systems/route.ts
│   ├── systems/[systemId]/route.ts
│   ├── incidents/route.ts
│   ├── gpai/route.ts
│   └── compliance-score/route.ts
```

---

## Key Feature Implementations

### 1. Compliance Score Engine (`lib/compliance-score.ts`)

Calculate a score (0–100) per AI system across modules:

| Module | Points |
|---|---|
| Risk Classification done | +10 |
| Risk Management Plan (APPROVED) | +10 |
| Technical Documentation (APPROVED) | +15 |
| Data Governance (APPROVED) | +10 |
| Human Oversight Plan (APPROVED) | +10 |
| Quality Management System (APPROVED) | +10 |
| Post-Market Plan (APPROVED) | +10 |
| Conformity Assessment (PASSED) | +15 |
| EU DB Registered | +10 |

Deductions:
- Open CRITICAL incident: -20
- Open HIGH incident: -10
- Overdue review: -5 each

### 2. AI Document Generator (`app/api/ai/generate-doc/route.ts`)

Use `claude-sonnet-4-20250514` to generate compliance documents.

**Request:** `{ systemId, module, orgContext, systemContext }`

**System prompt:**
```
You are an EU AI Act compliance expert generating legally-grounded documentation.
Generate a {module} document for an AI system with the following context:
{systemContext}

Requirements:
- Reference specific EU AI Act articles (Art. 9, 11, 14, etc.)
- Be specific, not generic
- Use professional regulatory language
- Structure with clear sections
- Flag areas where human legal review is recommended

Return structured JSON matching the {module} Prisma model fields.
Return ONLY valid JSON, no markdown.
```

### 3. Compliance Dashboard (`app/(dashboard)/page.tsx`)

Show:
- Overall org compliance score (average across all systems)
- Countdown to August 2, 2026
- Systems at risk (score < 50)
- Recently updated documents
- Pending reviews
- Open incidents
- Quick action cards per gap module

### 4. Per-System Compliance Checklist (`app/(dashboard)/systems/[systemId]/page.tsx`)

Render a checklist of all 10 compliance modules with:
- Status badge (Not Started / Draft / In Review / Approved)
- Last updated timestamp
- "Generate with AI" button → calls Claude doc generator
- "Review & Approve" button
- Progress bar showing score contribution

### 5. GPAI Module (`app/(dashboard)/gpai/`)

- Is your model open source? (yes → reduced obligations)
- Training compute input → auto-flag systemic risk if > 10²⁵ FLOPs
- Generate: Technical Documentation, Downstream Instructions, Training Data Summary
- Copyright policy checker
- Code of Practice adherence tracker
- Commission notification status

### 6. Incident Reporting Module (`app/(dashboard)/incidents/`)

- Log incidents with severity, date, affected persons
- Auto-generate incident report document
- Track reporting to national authority
- CRITICAL incidents trigger AgentMail email alert

### 7. Certificate Generation

Generate PDF certificates (`@react-pdf/renderer`) stored in Supabase Storage for:
- Risk Classification Certificate
- Technical Documentation Certificate
- Full Compliance Certificate (score > 80 required)

Each certificate includes: org name, system name, risk level, articles covered, score, date, expiry (1 year).

---

## AgentMail Integration

### Install

```bash
npm install agentmail
```

### Core Service (`lib/agentmail.ts`)

```typescript
import AgentMail from 'agentmail'

const client = new AgentMail({ apiKey: process.env.AGENTMAIL_API_KEY })

// Called on org creation via Clerk webhook
export async function createOrgInbox(orgId: string, orgSlug: string) {
  const username = `${orgSlug}-compliance`
  const inbox = await client.inboxes.create({
    username,
    domain: process.env.AGENTMAIL_DOMAIN,
  })

  await prisma.agentMailInbox.create({
    data: {
      orgId,
      inboxUsername: username,
      inboxEmail: `${username}@${process.env.AGENTMAIL_DOMAIN}`,
      agentMailId: inbox.id,
    },
  })

  return inbox
}

// Send compliance alert and track thread
export async function sendComplianceAlert({
  orgId, to, subject, body, threadType, aiSystemId,
}: {
  orgId: string
  to: string
  subject: string
  body: string
  threadType: ThreadType
  aiSystemId?: string
}) {
  const inbox = await prisma.agentMailInbox.findUnique({ where: { orgId } })
  if (!inbox) throw new Error('No inbox for org')

  const message = await client.inboxes.messages.send(inbox.agentMailId, {
    to: [{ email: to }],
    subject,
    text: body,
  })

  await prisma.emailThread.create({
    data: {
      inboxId: inbox.id,
      agentMailThreadId: message.threadId,
      subject,
      threadType,
      aiSystemId,
      lastMessageAt: new Date(),
      status: 'OPEN',
    },
  })

  return message
}

// Process inbound emails (called from webhook)
export async function processInboundEmail(payload: AgentMailWebhookPayload) {
  const { threadId, subject, text } = payload
  const thread = await prisma.emailThread.findUnique({
    where: { agentMailThreadId: threadId },
    include: { inbox: true },
  })
  if (!thread) return

  const action = await classifyEmailReply({ subject, text, thread })

  switch (action.type) {
    case 'AUTHORITY_CONFIRMATION':
      await prisma.eUDatabaseRegistration.update({
        where: { aiSystemId: thread.aiSystemId! },
        data: { status: 'REGISTERED', registrationNumber: action.refNumber },
      })
      break
    case 'INCIDENT_ACKNOWLEDGED':
      await prisma.incidentReport.update({
        where: { id: thread.incidentId! },
        data: { status: 'REPORTED_TO_AUTHORITY', authorityRefNumber: action.refNumber },
      })
      break
    case 'DOCUMENT_REVIEW_REQUEST':
      await prisma.auditLog.create({
        data: {
          orgId: thread.inbox.orgId,
          action: 'INBOUND_REVIEW_REQUEST',
          module: 'EMAIL',
          after: { subject, summary: action.summary },
        },
      })
      break
  }

  await prisma.emailThread.update({
    where: { id: thread.id },
    data: { status: 'RESOLVED', lastMessageAt: new Date() },
  })
}

// Claude classifies inbound email intent
async function classifyEmailReply({ subject, text, thread }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Classify this inbound email reply in the context of EU AI Act compliance.
Subject: ${subject}
Body: ${text}
Thread Type: ${thread.threadType}

Return JSON only:
{ "type": string, "refNumber": string | null, "summary": string }

Possible types:
AUTHORITY_CONFIRMATION | INCIDENT_ACKNOWLEDGED | DOCUMENT_REVIEW_REQUEST | GENERAL_REPLY`,
      }],
    }),
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text)
}
```

### Webhook Handler (`app/api/webhooks/agentmail/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { processInboundEmail } from '@/lib/agentmail'

export async function POST(req: NextRequest) {
  const payload = await req.json()
  // TODO: Add HMAC signature verification
  if (payload.event === 'message.received') {
    await processInboundEmail(payload.data)
  }
  return NextResponse.json({ ok: true })
}
```

### Email Templates

#### Deadline Alert
```typescript
export function deadlineAlertEmail(system: AISystem, daysLeft: number) {
  const urgency = daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 30 ? 'HIGH' : 'MEDIUM'
  return {
    subject: `[${urgency}] EU AI Act Deadline: ${daysLeft} days — ${system.name}`,
    body: `
EU AI Act Enforcement Deadline Alert
=====================================
System:           ${system.name}
Risk Level:       ${system.riskLevel}
Compliance Score: ${system.complianceScore}/100
Days Remaining:   ${daysLeft} (August 2, 2026)

OUTSTANDING GAPS:
${getOutstandingGaps(system).map(g => `• ${g}`).join('\n')}

Log in to ComplianceForge to address these gaps:
https://complianceforge-ai.com/dashboard

Reply to this email to mark items as addressed or flag an issue.

--
ComplianceForge.ai | This is not legal advice.
    `.trim(),
  }
}
```

#### Incident Report Filed
```typescript
export function incidentReportEmail(incident: IncidentReport, system: AISystem) {
  return {
    subject: `[INCIDENT-${incident.id.slice(-6).toUpperCase()}] ${incident.severity} — ${system.name}`,
    body: `
Incident Report Created
=======================
ID:          INCIDENT-${incident.id.slice(-6).toUpperCase()}
System:      ${system.name}
Severity:    ${incident.severity}
Date:        ${incident.incidentDate.toLocaleDateString('en-GB')}
Description: ${incident.description}

${incident.severity === 'CRITICAL' || incident.severity === 'HIGH'
  ? '⚠️  This incident may require reporting to your national AI authority within 15 days (Art. 73).'
  : '• Review and assign corrective actions in your dashboard.'}

Dashboard: https://complianceforge-ai.com/dashboard/incidents/${incident.id}

Reply to update the incident status or add notes.
    `.trim(),
  }
}
```

#### Document Review Request
```typescript
export function documentReviewEmail(doc: TechnicalDocumentation, reviewerEmail: string) {
  return {
    subject: `Review Requested: Technical Documentation — ${doc.aiSystem.name}`,
    body: `
Document Review Request
========================
Document:     Technical Documentation (Annex IV)
System:       ${doc.aiSystem.name}
Requested By: ${doc.approvedBy}
Status:       ${doc.status}

Review here: https://complianceforge-ai.com/dashboard/systems/${doc.aiSystemId}/technical-docs

Reply APPROVE or REQUEST CHANGES to update the document status automatically.
    `.trim(),
  }
}
```

### AgentMail Email Trigger Map

| Trigger | Template | ThreadType |
|---|---|---|
| Org created (Clerk webhook) | Welcome + inbox setup | `TEAM_NOTIFICATION` |
| Compliance score drops < 50 | Score alert | `DEADLINE_ALERT` |
| 90 / 60 / 30 / 7 days to deadline | Deadline alert | `DEADLINE_ALERT` |
| CRITICAL or HIGH incident filed | Incident report | `INCIDENT_REPORT` |
| Document → `IN_REVIEW` | Review request | `DOCUMENT_REVIEW` |
| EU DB registration updated | Confirmation | `AUTHORITY_COMMUNICATION` |
| Inbound email received | AI classifies + acts | *(auto-routed)* |

### Org Inbox UI (`app/(dashboard)/settings/page.tsx`)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Compliance Inbox</CardTitle>
    <CardDescription>
      All compliance communications are sent from and received at this address.
      Forward authority emails here to auto-update your compliance records.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2 font-mono text-sm bg-muted p-3 rounded">
      <Mail className="h-4 w-4" />
      {inbox.inboxEmail}
      <CopyButton value={inbox.inboxEmail} />
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Replies to deadline alerts, incident reports, and authority communications
      are automatically processed by your compliance agent.
    </p>
  </CardContent>
</Card>
```

---

## UI/UX Design System

| Token | Value |
|---|---|
| Background | `#0A0F1E` (deep navy) |
| Primary | `#2563EB` (electric blue) |
| Warning | `#F59E0B` (amber) |
| Danger | `#EF4444` (red) |
| Success | `#10B981` (green) |
| Font Body | IBM Plex Sans |
| Font Mono | IBM Plex Mono (article refs, code) |

**Layout rules:**
- Fixed left sidebar with module icons
- Compliance score ring at sidebar bottom
- Each compliance module = card with status pill + score contribution + AI Generate button
- Circular progress ring on system overview
- Sticky top banner when < 60 days to enforcement deadline (red at < 30 days)

---

## Environment Variables

```env
# Existing
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
DIRECT_URL=
GEMINI_API_KEY=
GITHUB_TOKEN=

# New
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
AGENTMAIL_API_KEY=
AGENTMAIL_DOMAIN=complianceforge.ai
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

---

## Full Verification Checklist

### Database
- [ ] All Prisma models migrate without error
- [ ] RLS policies set in Supabase per `orgId`
- [ ] Seed script creates demo org with 2 AI systems

### Auth & Multi-tenancy
- [ ] Clerk org switcher works
- [ ] All API routes validate `orgId` from Clerk session
- [ ] Users can only access their org's data

### AI Document Generation
- [ ] Claude generates valid JSON for all 7 document types
- [ ] Generated docs populate form fields correctly
- [ ] Retry logic on Claude API failure (fallback to manual entry)

### Compliance Score
- [ ] Score recalculates on every document status change
- [ ] Score displayed on dashboard and system overview
- [ ] Score < 50 triggers "At Risk" badge

### Certificates
- [ ] PDF generates with correct org/system data
- [ ] PDF stored in Supabase Storage
- [ ] Download link works from certificates page
- [ ] Full Compliance Certificate blocked if score < 80

### Incidents
- [ ] CRITICAL incident triggers AgentMail email alert
- [ ] Incident affects compliance score immediately
- [ ] Incident report PDF can be generated

### GPAI Module
- [ ] Systemic risk auto-flagged at 10²⁵ FLOPs
- [ ] Open-source toggle reduces visible obligations
- [ ] Training data summary generated by Claude

### AgentMail
- [ ] Inbox created automatically on org signup
- [ ] Inbox email displayed in org Settings page
- [ ] Deadline alerts sent from org inbox (not noreply@)
- [ ] Incident reports trigger email with correct severity
- [ ] Document review requests route to correct reviewer
- [ ] Inbound webhook processes authority reply emails
- [ ] Claude classifies inbound email and updates correct DB record
- [ ] Thread status tracked in `EmailThread` model
- [ ] Email threads visible in dashboard Inbox view
- [ ] Resend removed after AgentMail migration complete

### Billing
- [ ] Stripe checkout works for all 3 plans
- [ ] Plan limits enforced (3 systems on Starter, 15 on Growth)
- [ ] Webhook updates plan in DB on subscription change

### Deadline Tracker
- [ ] Countdown shows correct days to August 2, 2026
- [ ] Colour shifts: green → amber (90 days) → red (30 days)
- [ ] Per-system deadline status by risk level:
  - High-risk: **Aug 2, 2026**
  - GPAI: **Aug 2, 2025** (passed — flag as urgent)
  - Prohibited: **Feb 2, 2025** (passed — flag critical)

---

## Scope Disclaimer (add to UI footer)

> ComplianceForge generates compliance-ready documentation templates.
> For high-risk AI systems requiring third-party conformity assessment, consult an EU Notified Body.
> **This is not legal advice.**

---

## Migration: Remove Resend

After AgentMail integration is complete and verified:

```bash
npm uninstall resend
```

1. Delete `lib/resend.ts`
2. Remove `RESEND_API_KEY` from `.env`
3. Confirm all email triggers route through `lib/agentmail.ts`

---

*ComplianceForge.ai — BuildwithAiGiri Series | intelliforge.digital*
