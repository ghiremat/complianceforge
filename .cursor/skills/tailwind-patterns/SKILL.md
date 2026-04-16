---
name: tailwind-patterns
description: >-
  Tailwind CSS patterns and best practices for ComplianceForge. Covers responsive design,
  dark mode, layout patterns, color system, and component extraction rules.
  Use when styling components or building layouts.
---

# Tailwind CSS Patterns — ComplianceForge

> ComplianceForge uses Tailwind CSS v3.4 with `tailwind-merge` and `tailwindcss-animate`.

## Configuration

- Config: `tailwind.config.ts`
- PostCSS: `postcss.config.mjs`
- Global CSS: `src/app/globals.css`
- Utility: `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`)

## Layout Patterns

### Flexbox

| Pattern | Classes |
|---------|---------|
| Center (both axes) | `flex items-center justify-center` |
| Vertical stack | `flex flex-col gap-4` |
| Horizontal row | `flex gap-4` |
| Space between | `flex justify-between items-center` |

### Grid

| Pattern | Classes |
|---------|---------|
| Dashboard cards | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` |
| Two-column form | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| Auto-fit responsive | `grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6` |

### Spacing Rules

- **Use `gap-*` not `space-y-*`**: `flex flex-col gap-4` over `space-y-4`
- **Use `size-*` when w=h**: `size-10` over `w-10 h-10`
- **Page padding**: `p-6 md:p-8`
- **Section spacing**: `space-y-8` for page sections (exception: top-level only)
- **Card internal**: `p-6` consistent

## Responsive Design (Mobile-First)

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile-first base |
| `sm:` | 640px | Large phone |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |

Write mobile styles first, then override up:
```
w-full md:w-1/2 lg:w-1/3
text-sm md:text-base
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
```

## Dark Mode

ComplianceForge uses CSS variables for theming via shadcn/ui:
- Use semantic tokens: `bg-background`, `text-foreground`, `bg-card`, `bg-muted`
- **Never** use manual `dark:` overrides on semantic tokens
- Border: `border` class uses the semantic border color

## Color System

| Purpose | Token | Usage |
|---------|-------|-------|
| Background | `bg-background` | Page background |
| Card | `bg-card` | Card surfaces |
| Primary | `bg-primary` | Primary buttons, accents |
| Muted | `bg-muted` | Subtle backgrounds |
| Destructive | `bg-destructive` | Delete actions, errors |
| Success | `text-green-600` | Compliant status |
| Warning | `text-amber-500` | At-risk status |
| Danger | `text-red-600` | Non-compliant status |

## Animation

Using `tailwindcss-animate` plugin:

| Pattern | Classes |
|---------|---------|
| Fade in | `animate-in fade-in` |
| Slide up | `animate-in slide-in-from-bottom-2` |
| Pulse | `animate-pulse` |
| Spin | `animate-spin` |
| Transition | `transition-colors duration-200` |

## Anti-Patterns

| Don't | Do |
|-------|----|
| Arbitrary values everywhere | Use design system scale |
| `!important` | Fix specificity properly |
| Inline `style=` | Use utilities |
| Duplicate long class lists | Extract to component |
| Raw color values (`bg-blue-500`) | Semantic tokens (`bg-primary`) |
| `space-y-*` | `flex flex-col gap-*` |

## cn() Usage

Always use `cn()` for conditional classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "rounded-lg border p-4",
  isActive && "border-primary bg-primary/5",
  isDisabled && "opacity-50 pointer-events-none"
)} />
```
