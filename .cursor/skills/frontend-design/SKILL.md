---
name: frontend-design
description: >-
  Create distinctive, production-grade frontend interfaces for ComplianceForge.
  Use when building new pages, components, or improving existing UI.
  Ensures enterprise-quality design that communicates trust and authority.
---

# Frontend Design — ComplianceForge

## Design Philosophy

ComplianceForge serves **compliance officers, CTOs, and legal teams** managing EU AI Act compliance.
The interface must balance:

- **Authority**: Enterprise-grade, trustworthy appearance
- **Clarity**: Dense compliance data presented clearly
- **Actionability**: Every screen guides the user toward their next step

## Design Direction

### Aesthetic: Professional Enterprise with Modern Polish

- Clean, structured layouts with clear visual hierarchy
- Subtle depth via shadows and borders (not gradients)
- Data-dense but not overwhelming — progressive disclosure
- Consistent spacing rhythm based on 4px/8px grid

### Color Strategy

| Role | Application |
|------|------------|
| Dark neutrals | Navigation, headers, authority elements |
| White/light cards | Content areas, data display |
| Blue accents | CTAs, links, interactive elements |
| Status colors | Green=compliant, Amber=at-risk, Red=non-compliant |

### Typography Rules

- **Page titles**: `text-2xl font-bold tracking-tight`
- **Section headers**: `text-lg font-semibold`
- **Body text**: `text-sm text-muted-foreground`
- **Data/metrics**: `text-3xl font-bold tabular-nums`
- **Labels**: `text-xs font-medium uppercase tracking-wider text-muted-foreground`

## Page Templates

### Dashboard
- Top: `PageHeader` with title + action buttons
- KPI row: 4-column grid of `StatCard` components
- Main content: Split into sections with `Card` containers
- Compliance score: Prominent `ComplianceScoreRing`

### List/Table Page
- Top: `PageHeader` with title + "Add New" button
- Filters: Horizontal filter bar with `Select` dropdowns
- Content: `Table` with sortable columns
- Empty: `EmptyState` with illustration and CTA

### Detail Page
- Breadcrumb navigation
- Header with system name + status badge
- `Tabs` for different sections (Overview, Assessments, Documents, etc.)
- Action buttons in top-right

## Component Patterns

### Cards
```
CardHeader → CardTitle + CardDescription
CardContent → Main content
CardFooter → Actions (optional)
```
Always use full composition, never dump everything in `CardContent`.

### Status Communication
- Use `StatusBadge` with semantic variants
- Pair color with text label (never color alone)
- Include icon for additional clarity

### Data Visualization
- Use Recharts via shadcn Chart wrapper
- Compliance score: Radial/ring chart
- Trends: Area/line charts
- Comparisons: Bar charts
- Always include axis labels and legends

## Implementation Checklist

Before delivering any frontend work:

- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] All interactive elements have hover/focus states
- [ ] Loading states use `Skeleton` components
- [ ] Error states show helpful messages with retry actions
- [ ] Empty states guide users to take action
- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] No layout shift on state changes
