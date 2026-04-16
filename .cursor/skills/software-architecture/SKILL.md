---
name: software-architecture
description: >-
  Guide for quality-focused software architecture in ComplianceForge. Use when writing code,
  designing architecture, analyzing code, or making structural decisions. Based on Clean Architecture
  and Domain-Driven Design adapted for Next.js App Router.
---

# Software Architecture — ComplianceForge

## Architecture Overview

ComplianceForge follows a layered architecture within the Next.js App Router:

```
src/app/           → Pages & API routes (presentation layer)
src/components/    → UI components (presentation layer)
lib/               → Business logic & domain services
server/            → Database access (infrastructure layer)
prisma/            → Schema & migrations (infrastructure layer)
types/             → Shared TypeScript interfaces (domain layer)
```

## Code Style Rules

### General Principles

- **Early return pattern**: Always use early returns over nested conditions
- Avoid code duplication through reusable functions and modules
- Decompose long (>80 lines) components into smaller ones
- Use arrow functions instead of function declarations
- Keep files under 200 lines; split if longer

### Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| Prisma models | PascalCase | `AiSystem`, `ComplianceDeadline` |
| API routes | kebab-case dirs | `src/app/api/systems/route.ts` |
| Components | PascalCase files | `ComplianceScoreRing.tsx` |
| Lib functions | camelCase | `calculateComplianceScore()` |
| Types | PascalCase interfaces | `interface AiSystemWithScore` |

### Architecture Rules

- **Separate domain from infrastructure**: Business logic in `lib/`, database in `server/`
- **No Prisma imports in components**: Components get data via props or API calls
- **API routes are thin**: Validate → call service → return response
- **Server Components by default**: Only add `"use client"` when needed
- **Single responsibility**: Each file/function does one thing

### Anti-Patterns to Avoid

| Don't | Do |
|-------|----|
| Import Prisma in components | Pass data as props from server components |
| Put business logic in API routes | Extract to `lib/` service functions |
| Use `utils.ts` as a dumping ground | Create domain-specific modules |
| Mix auth logic with business logic | Separate auth middleware from domain services |
| Hardcode EU AI Act articles | Use the policy engine (`lib/policy-engine.ts`) |

### Code Quality

- Proper error handling with typed catch blocks
- Break complex logic into smaller functions
- Avoid deep nesting (max 3 levels)
- Keep functions under 50 lines
- Use Zod for runtime validation at API boundaries

## Domain Model

ComplianceForge's domain centers on:

1. **Organizations** — multi-tenant isolation
2. **AI Systems** — the entities being assessed for compliance
3. **Assessments** — risk classification and compliance gap analysis
4. **Documents** — technical documentation per EU AI Act requirements
5. **Compliance Scoring** — automated scoring against regulation requirements
6. **Passport** — public trust pages for transparency

## API Design

- RESTful routes under `src/app/api/`
- SDK API under `src/app/api/v1/` for external integrations
- Auth via NextAuth session or API key (`lib/api-auth.ts`)
- Consistent error shapes: `{ error: string, status: number }`
