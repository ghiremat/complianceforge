# ComplianceForge UI/UX Improvement Plan

## Multi-Subagent Execution Strategy for Cursor

> Based on [UI UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) analysis  
> Target: Cybersecurity/Compliance SaaS — **Minimalism & Swiss Style** + **Data-Dense Dashboard**

---

## Current State Summary

| Aspect | Current | Target |
|--------|---------|--------|
| Component library | None (raw HTML + Tailwind) | shadcn/ui (new-york style) |
| Design tokens | 2 CSS vars, hardcoded colors | Full HSL variable system |
| Typography | Inter only | IBM Plex Sans + IBM Plex Mono |
| Dashboard | 1 file, 903 lines, 6 client tabs | 6+ route-level pages, shared layout |
| Components folder | 1 file (`session-provider.tsx`) | Full component library |
| Toasts/feedback | `sonner` installed but unused | Wired up on all mutations |
| Accessibility | None | WCAG AA baseline |
| Background | `#0a0a0f` (pure black) | `#0A0F1E` (deep navy per spec) |

---

## Phase 1 — Foundation (Design System + shadcn/ui)

**Goal:** Establish the design infrastructure everything else builds on.  
**Parallelism:** 3 subagents, fully independent.

### Agent 1A: Initialize shadcn/ui + Design Tokens

**Scope:** Install shadcn/ui, configure CSS variables, update `tailwind.config.ts`

**Steps:**
1. Run `npx shadcn@latest init` (style: `new-york`, base color: `blue`, CSS variables: yes)
2. Replace `src/app/globals.css` with full shadcn CSS variable system using ComplianceForge tokens:
   ```
   Background:  #0A0F1E (deep navy) → hsl(228, 50%, 8%)
   Primary:     #2563EB (electric blue) → hsl(217, 91%, 60%)
   Warning:     #F59E0B (amber)
   Danger:      #EF4444 (red)
   Success:     #10B981 (green)
   Card:        hsl(222, 47%, 11%) — slate-900 equivalent
   Border:      hsl(217, 33%, 17%) — slate-800 equivalent
   Muted:       hsl(217, 33%, 17%)
   ```
3. Update `tailwind.config.ts`:
   - Add `tailwindcss-animate` plugin
   - Add shadcn color variable mappings under `extend.colors`
   - Add IBM Plex Sans + IBM Plex Mono under `extend.fontFamily`
4. Update `src/app/layout.tsx`:
   - Import `IBM_Plex_Sans` and `IBM_Plex_Mono` from `next/font/google`
   - Set `IBM_Plex_Sans` as body font, export mono as CSS variable `--font-mono`
   - Add `<Toaster />` from sonner with dark theme
5. Install deps: `npm install tailwindcss-animate class-variance-authority @radix-ui/react-slot`

**Output:** `globals.css`, `tailwind.config.ts`, `layout.tsx`, `components.json` all updated. Build passes.

---

### Agent 1B: Install Core shadcn/ui Components

**Scope:** Install the shadcn components used across the app

**Steps:**
1. Install these components via CLI:
   ```
   npx shadcn@latest add button card badge table tabs dialog
   npx shadcn@latest add accordion select input textarea label
   npx shadcn@latest add dropdown-menu tooltip progress separator
   npx shadcn@latest add skeleton sheet avatar alert
   ```
2. Verify all installed to `src/components/ui/`
3. Confirm `@/lib/utils.ts` path alias works (shadcn expects `cn()` there — already exists)

**Output:** `src/components/ui/` populated with ~18 components. No app code changes yet.

---

### Agent 1C: Create Shared App Components

**Scope:** Extract reusable patterns from the current dashboard into proper components

**Steps:**
1. Create `src/components/status-badge.tsx`:
   - Wraps shadcn `Badge` with semantic variants:
     `risk-unacceptable | risk-high | risk-limited | risk-minimal | risk-unassessed`
     `status-draft | status-review | status-approved | status-expired`
     `urgency-critical | urgency-high | urgency-medium | urgency-low`
   - Replaces `riskBadgeColor()`, `urgencyColor()`, `scoreColor()` from `lib/utils.ts`

2. Create `src/components/compliance-score-ring.tsx`:
   - SVG donut chart showing score 0–100
   - Color transitions: red < 50, yellow 50–79, green 80+
   - Accepts `size`, `score`, `label` props
   - Animated fill on mount

3. Create `src/components/score-bar.tsx`:
   - Wraps shadcn `Progress` with score-based coloring
   - Replaces inline `<div className="h-2 rounded-full">` pattern

4. Create `src/components/stat-card.tsx`:
   - Reusable stat card: icon, label, value, accent color
   - Uses shadcn `Card`

5. Create `src/components/page-header.tsx`:
   - Title + optional description + optional action button slot
   - Consistent typography: `text-2xl font-semibold`

6. Create `src/components/empty-state.tsx`:
   - Icon + heading + description + optional CTA
   - Used when tables/lists have no data

7. Create `src/components/enforcement-countdown.tsx`:
   - The sticky enforcement badge (top bar + hero)
   - Self-contained date logic

**Output:** 7 shared components in `src/components/`. Unit of visual consistency.

---

## Phase 2 — Dashboard Decomposition

**Goal:** Break the 903-line monolith into route-level pages with shared layout.  
**Dependency:** Phase 1 must be complete (components + tokens available).  
**Parallelism:** 2 subagents.

### Agent 2A: Dashboard Layout + Sidebar

**Scope:** Create the shared dashboard shell

**Steps:**
1. Create `src/app/(dashboard)/layout.tsx`:
   - Server component wrapper
   - Fixed left sidebar: logo, nav links (use `Link` from `next/link`), user avatar area, sign-out
   - Sidebar uses `<nav aria-label="Main navigation">` for accessibility
   - Sticky top bar with mobile Sheet (shadcn) menu + enforcement countdown badge
   - `<main>` content area with consistent padding
   - Nav items with `lucide-react` icons, active state from `usePathname()`

2. Nav structure (each becomes a route):
   ```
   /dashboard           → Command Center (LayoutDashboard icon)
   /dashboard/systems   → AI Inventory (Server icon)
   /dashboard/scanner   → GitHub Scanner (GitBranch icon)
   /dashboard/tracker   → Compliance Tracker (CheckSquare icon)
   /dashboard/deadlines → Deadlines (Calendar icon)
   /dashboard/reports   → Reports (FileText icon)
   ```

3. Move session check to layout level (redirect to `/sign-in` if unauthenticated)
4. Add `<Toaster />` here if not in root layout
5. Apply `cursor-pointer` to all nav buttons
6. Add `transition-colors duration-200` to all interactive sidebar elements
7. Add visible `focus-visible:ring-2 focus-visible:ring-blue-500` to nav items

**Output:** Shared layout with sidebar. Each child route renders inside `<main>`.

---

### Agent 2B: Migrate 6 Tabs to 6 Route Pages

**Scope:** Extract each tab from the monolith into its own page

**Steps:**
1. **`src/app/(dashboard)/page.tsx`** — Command Center:
   - Enforcement countdown hero (use `enforcement-countdown` component)
   - Stat cards grid (use `stat-card` component)
   - Risk distribution pie chart (keep Recharts)
   - Upcoming deadlines list (use `StatusBadge`)
   - Use `Skeleton` components for loading states

2. **`src/app/(dashboard)/systems/page.tsx`** — AI Inventory:
   - Add System button → opens shadcn `Dialog` (not inline panel)
   - Systems data table using shadcn `Table`
   - Risk badges using `StatusBadge` component
   - Compliance bars using `ScoreBar` component
   - Classify AI action button with spinner

3. **`src/app/(dashboard)/scanner/page.tsx`** — GitHub Scanner:
   - Scan form using shadcn `Input`, `Select`, `Button`
   - Results card with `ScoreRing` for overall score
   - Article findings using `Card` + `ScoreBar`
   - Priority fixes as numbered alert list

4. **`src/app/(dashboard)/tracker/page.tsx`** — Compliance Tracker:
   - System selector using shadcn `Select`
   - Progress overview using `ScoreBar` + `ComplianceScoreRing`
   - Compliance items using shadcn `Accordion`
   - Status/evidence editors using shadcn `Select`, `Textarea`, `Button`
   - Toast on save success/failure via `sonner`

5. **`src/app/(dashboard)/deadlines/page.tsx`** — Deadlines:
   - Timeline cards using `Card` + `StatusBadge`
   - Urgency-based border colors
   - Days remaining counter

6. **`src/app/(dashboard)/reports/page.tsx`** — Reports:
   - System selector + generate button
   - Report URL with copy action (toast on copy)
   - Report preview card with header gradient

7. Wire up `sonner` toasts on all mutation actions:
   - System added → success toast
   - Classification complete → success toast
   - Compliance item saved → success toast
   - Scan complete → success/error toast
   - Copy URL → "Copied to clipboard" toast

8. Delete the old monolith `src/app/dashboard/page.tsx` after migration

**Output:** 6 separate route pages, each < 200 lines. Old monolith removed.

---

## Phase 3 — Visual Polish & Interactions

**Goal:** Apply UI UX Pro Max pre-delivery checklist and interaction improvements.  
**Dependency:** Phase 2 must be complete.  
**Parallelism:** 3 subagents, fully independent.

### Agent 3A: Typography + Color Audit

**Scope:** Enforce consistent type scale and color usage across all pages

**Steps:**
1. Audit and fix all heading levels:
   - Page title: `text-2xl font-semibold` (not `font-black`)
   - Section heading: `text-lg font-semibold`
   - Card title: `text-base font-medium`
   - Body: `text-sm font-normal`
   - Labels: `text-xs font-medium tracking-wide uppercase`
   - Article refs: `text-xs font-mono font-medium`

2. Replace all hardcoded color values:
   - `bg-[#0a0a0f]` → `bg-background`
   - `text-white` on headings → `text-foreground`
   - `text-slate-400` → `text-muted-foreground`
   - `bg-slate-900` → `bg-card`
   - `border-slate-800` → `border-border`
   - `bg-indigo-600` → `bg-primary`
   - `text-indigo-400` → `text-primary`
   - `hover:bg-indigo-500` → `hover:bg-primary/90`

3. Ensure consistent border radius: `rounded-lg` everywhere (not mixing xl/2xl/3xl)

4. Verify all text meets 4.5:1 contrast ratio on `#0A0F1E` background:
   - `text-slate-600` is too low contrast → change to `text-slate-400` minimum
   - `text-slate-500` borderline → verify and adjust

**Output:** All pages use semantic color tokens and consistent typography.

---

### Agent 3B: Interaction Polish (Hover, Focus, Motion)

**Scope:** Apply the pre-delivery checklist interaction requirements

**Steps:**
1. **Cursor pointer audit:**
   - Add `cursor-pointer` to every clickable element (buttons already have it, check custom `<div onClick>`, table rows, cards)

2. **Hover states:**
   - All buttons: `transition-colors duration-200`
   - Table rows: `hover:bg-muted/50 transition-colors`
   - Cards with click handlers: `hover:border-primary/30 transition-all duration-200`
   - Sidebar items: already have hover, verify transition

3. **Focus states:**
   - All interactive elements: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
   - shadcn components handle this by default, verify custom elements

4. **Motion safety:**
   - Wrap `animate-pulse` (enforcement dot) in `motion-safe:animate-pulse`
   - Wrap `animate-spin` (loading spinners) in `motion-safe:animate-spin`
   - Add `transition-all duration-200` → verify with `motion-reduce:transition-none`

5. **Loading states:**
   - Replace empty `<p>Loading...</p>` with `Skeleton` components
   - Add skeleton for: stats grid, systems table, deadlines list, system detail
   - Ensure all API-calling buttons show loading spinner

**Output:** All interactions smooth, accessible, and motion-safe.

---

### Agent 3C: Accessibility (WCAG AA)

**Scope:** Bring the app to WCAG AA baseline

**Steps:**
1. **Landmarks:**
   - Sidebar: `<nav aria-label="Main navigation">`
   - Main content: `<main aria-label="Dashboard content">`
   - Top bar: `<header role="banner">`
   - Add skip-to-content link: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>`

2. **ARIA labels:**
   - Mobile menu toggle: `aria-label="Toggle navigation menu"`
   - Icon-only buttons (close, copy, external link): add `aria-label`
   - Sign out button: `aria-label="Sign out of your account"`
   - Score ring SVG: `role="img" aria-label="Compliance score: 75%"`

3. **Form labels:**
   - All `<label>` elements get `htmlFor` matching input `id`
   - Currently labels are visual-only `<label className="block">` with no `htmlFor`

4. **Live regions:**
   - Enforcement countdown: `aria-live="polite"` (updates dynamically)
   - Compliance score: `role="status"` on score display
   - Toast notifications: `sonner` handles this automatically

5. **Color independence:**
   - Risk badges already have text labels + color — good
   - Score bars: add `aria-label="Compliance: 75%"` to progress bars
   - Status dots (red/green/yellow) in reports: add text label alongside

6. **Keyboard navigation:**
   - Verify tab order in sidebar matches visual order
   - Accordion items must be keyboard-navigable (shadcn handles this)
   - Dialog close on Escape (shadcn handles this)

**Output:** WCAG AA compliance across all pages.

---

## Phase 4 — Data Visualization & Dashboard Upgrades

**Goal:** Upgrade the Command Center with richer data visualization.  
**Dependency:** Phase 2 + 3.  
**Parallelism:** 2 subagents.

### Agent 4A: Compliance Score Ring + Module Grid

**Scope:** Replace text-based scores with visual components

**Steps:**
1. Add `ComplianceScoreRing` to Command Center hero (next to or replacing the text score)
2. Add per-system score rings in the AI Inventory table (small inline rings)
3. Create `src/components/module-status-grid.tsx`:
   - 10-cell grid (one per compliance module from the spec)
   - Each cell: module name, status color (green/yellow/red/gray), last updated
   - Visual heat-map effect for instant status scanning
   - Used on system detail pages

4. Add sparkline trend chart to Command Center:
   - Small line chart showing org compliance score over last 30 days
   - Use Recharts `LineChart` with minimal styling

**Output:** Dashboard is visually data-rich rather than text-heavy.

---

### Agent 4B: Chart Improvements + Empty States

**Scope:** Polish existing charts and add proper empty states

**Steps:**
1. Risk distribution pie chart:
   - Add proper legend with counts
   - Custom tooltip with percentage
   - Add center label showing total systems count

2. Wire up `EmptyState` component everywhere:
   - No systems: Shield icon + "Register your first AI system" + CTA button
   - No scan results: GitBranch icon + "Scan a repository to see compliance gaps"
   - No deadlines: Calendar icon + "No upcoming deadlines"
   - No report selected: FileText icon + "Select a system to generate a report"

3. Add subtle card hover elevation on Command Center stat cards:
   - `hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200`

**Output:** No more bare "Loading..." or empty tables. Rich visual feedback.

---

## Phase 5 — Landing & Auth Pages

**Goal:** Apply Trust & Authority landing page pattern from UI UX Pro Max.  
**Dependency:** Phase 1 (design tokens).  
**Parallelism:** 2 subagents.

### Agent 5A: Sign-In Page Polish

**Scope:** Refine the existing sign-in page with new design tokens

**Steps:**
1. Update background from `#0a0a0f` to `bg-background` (deep navy)
2. Update all color references to use CSS variable tokens
3. Apply IBM Plex Sans typography
4. Fix accessibility:
   - `htmlFor` on all labels
   - Focus rings on inputs
   - Error message: `role="alert"`
5. Improve comparison table with shadcn `Table` component
6. Add `transition-all duration-200` on form interactions
7. Ensure responsive at 375px / 768px / 1024px / 1440px

**Output:** Sign-in page matches new design system.

---

### Agent 5B: Sign-Up Page Polish

**Scope:** Update the sign-up page to match

**Steps:**
1. Read current sign-up page, apply same token/typography updates as sign-in
2. Ensure consistent form styling with shadcn `Input`, `Button`, `Label`
3. Add password strength indicator if not present
4. Responsive audit at 375px / 768px / 1024px / 1440px
5. Accessibility: labels, focus states, error alerts

**Output:** Consistent auth experience across sign-in and sign-up.

---

## Execution Sequence

```
Phase 1 (Foundation)          ← Run 3 agents in parallel
  ├─ 1A: Design tokens + shadcn init
  ├─ 1B: Install shadcn components
  └─ 1C: Create shared components
              │
              ▼
Phase 2 (Decomposition)       ← Run 2 agents in parallel
  ├─ 2A: Dashboard layout + sidebar
  └─ 2B: Migrate 6 tabs to 6 routes
              │
              ▼
Phase 3 (Polish)              ← Run 3 agents in parallel
  ├─ 3A: Typography + color audit
  ├─ 3B: Interaction polish
  └─ 3C: Accessibility
              │
              ▼
Phase 4 (Data Viz)            ← Run 2 agents in parallel
  ├─ 4A: Score ring + module grid
  └─ 4B: Charts + empty states
              │
              ▼
Phase 5 (Auth Pages)          ← Run 2 agents in parallel
  ├─ 5A: Sign-in polish
  └─ 5B: Sign-up polish
```

## Estimated Effort

| Phase | Agents | Est. Time | Files Changed |
|-------|--------|-----------|---------------|
| 1 | 3 parallel | 15-20 min | 12-15 new, 3 modified |
| 2 | 2 parallel | 20-30 min | 8 new, 1 deleted |
| 3 | 3 parallel | 15-20 min | 10-15 modified |
| 4 | 2 parallel | 10-15 min | 4-6 new/modified |
| 5 | 2 parallel | 10-15 min | 2-3 modified |
| **Total** | **12 agents** | **~70-100 min** | **~35-40 files** |

## Validation After Each Phase

| Phase | Validation Command | Pass Criteria |
|-------|-------------------|---------------|
| 1 | `npm run build` | No TS errors, shadcn components importable |
| 2 | `npm run build` + manual nav | All 6 routes render, sidebar works, old monolith deleted |
| 3 | `npm run build` + `npx next lint` | No lint errors, all colors use tokens |
| 4 | `npm run build` | Charts render, empty states show correctly |
| 5 | `npm run build` | Auth pages render with new design system |

## Anti-Patterns to Avoid (per UI UX Pro Max)

- No neon/aurora gradients — undermines trust for compliance B2B
- No playful animations that distract from data
- No inconsistent border-radius mixing (stick to `rounded-lg`)
- No emojis as icons — use Lucide SVGs only
- No color-only status indicators — always pair with text
- No `font-black` for headings — use `font-semibold` max
- No purple/pink AI gradients — this is regulatory tech, not consumer AI
