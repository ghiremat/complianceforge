---
name: ui-ux-pro-max
description: >-
  Comprehensive UI/UX design guide for ComplianceForge. Enterprise compliance dashboard
  aesthetics, accessibility, dark/light mode, responsive patterns, and professional
  data visualization. Use when designing or improving any UI component.
---

# UI/UX Pro Max — ComplianceForge

## Design Identity

ComplianceForge is an **enterprise EU AI Act compliance platform**. The UI must communicate:
- **Trust & Authority** — Legal/regulatory domain demands professionalism
- **Clarity** — Complex compliance data must be immediately understandable
- **Action-Oriented** — Users need to know what to do next

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `hsl(222.2, 47.4%, 11.2%)` | Headers, primary actions |
| Accent | Blue-600 range | CTAs, progress indicators |
| Success | Green-600 | Compliant status |
| Warning | Amber-500 | At-risk, approaching deadline |
| Danger | Red-600 | Non-compliant, overdue |
| Muted | Slate-400/500 | Secondary text, borders |

### Typography

- **Headings:** System font stack (Inter if available)
- **Body:** 14-16px, readable line-height (1.5-1.6)
- **Data:** Tabular nums for scores and percentages
- **Code:** Monospace for API keys, system IDs

## Common Rules for Professional UI

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| No emoji icons | Use Lucide React SVG icons | Use emojis like 🎨 🚀 ⚙️ as UI icons |
| Consistent icon sizing | Use `size-4`, `size-5`, `size-6` consistently | Mix different icon sizes |
| Status indicators | Use colored dots/badges with text labels | Rely on color alone |

### Interaction & Cursor

| Rule | Do | Don't |
|------|----|----- |
| Cursor pointer | Add `cursor-pointer` to all clickable elements | Leave default cursor on interactive elements |
| Hover feedback | Provide visual feedback (color, shadow, border) | No indication element is interactive |
| Smooth transitions | Use `transition-colors duration-200` | Instant state changes or >500ms |

### Light/Dark Mode Contrast

| Rule | Do | Don't |
|------|----|----- |
| Card backgrounds | Use `bg-card` semantic token | Use `bg-white/10` (too transparent) |
| Text contrast | Use `text-foreground` for body | Use `text-muted-foreground` for critical info |
| Border visibility | Use `border` semantic class | Use `border-white/10` (invisible) |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|----- |
| Content padding | Account for fixed navbar height | Let content hide behind fixed elements |
| Consistent max-width | Use same `max-w-7xl` container | Mix different container widths |
| Card grids | Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` | Random spacing |

## Compliance-Specific UI Patterns

### Score Display
- Use `ComplianceScoreRing` for circular score visualization
- Color-code: <40 red, 40-70 amber, >70 green
- Always show numeric percentage alongside visual

### Risk Tier Badges
- **Unacceptable:** Red badge, bold
- **High Risk:** Orange/amber badge
- **Limited Risk:** Blue badge
- **Minimal Risk:** Green badge

### Deadline/Timeline
- Use `EnforcementCountdown` for EU AI Act deadlines
- Show urgency via color progression (green → amber → red)
- Include relative time ("in 45 days") alongside absolute dates

### Data Tables
- Use shadcn `Table` component with sortable headers
- Include row-level actions via `DropdownMenu`
- Show loading state with `Skeleton` rows
- Empty state with `EmptyState` component

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (use Lucide React)
- [ ] All icons from Lucide React library
- [ ] Hover states don't cause layout shift
- [ ] Semantic color tokens used throughout

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Responsive
- [ ] Works at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Cards stack vertically on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator (use text + icon)
- [ ] `prefers-reduced-motion` respected
- [ ] WCAG 2.1 AA contrast ratios met
