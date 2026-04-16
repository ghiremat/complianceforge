---
name: shadcn-patterns
description: >-
  Patterns and rules for using shadcn/ui components in ComplianceForge. Use when adding,
  composing, or debugging shadcn/ui components. Enforces consistent styling, composition,
  and accessibility across the compliance dashboard.
---

# shadcn/ui Patterns — ComplianceForge

## Project Context

- **Framework:** Next.js 14.2.5 App Router (RSC by default)
- **Base:** Radix UI primitives
- **Icons:** Lucide React
- **Styling:** Tailwind CSS 3.4 + `tailwind-merge` + `class-variance-authority`
- **Alias:** `@/*` maps to project root
- **UI path:** `src/components/ui/`
- **Custom components:** `src/components/` (score-ring, stat-card, status-badge, etc.)

## Installed Components

accordion, alert, avatar, badge, button, card, dialog, dropdown-menu,
input, label, progress, select, separator, sheet, skeleton, table,
tabs, textarea, tooltip

## Principles

1. **Use existing components first.** Check `src/components/ui/` before writing custom UI
2. **Compose, don't reinvent.** Dashboard = Sidebar + Card + Chart + Table
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw `bg-blue-500`

## Critical Rules

### Styling
- **`className` for layout, not component styling.** Never override component colors/typography
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`
- **Use `size-*` when width=height.** `size-10` not `w-10 h-10`
- **Use `cn()` for conditional classes.** Import from `@/lib/utils`
- **No manual `dark:` overrides.** Use semantic tokens

### Composition
- **Items always inside their Group.** `SelectItem` → `SelectGroup`
- **Dialog, Sheet always need a Title.** Use `className="sr-only"` if visually hidden
- **Use full Card composition.** `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`
- **`TabsTrigger` must be inside `TabsList`**
- **`Avatar` always needs `AvatarFallback`**

### Icons
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS
- **Pass icons as JSX, not strings.**

## Component Selection for ComplianceForge

| Need | Use |
|------|-----|
| Compliance score display | `compliance-score-ring` (custom) |
| System status | `status-badge` (custom) + `Badge` |
| Dashboard KPIs | `stat-card` (custom) + `Card` |
| Risk tier display | `Badge` with variant |
| Assessment forms | `Card` + `Input` + `Select` + `Textarea` |
| System details | `Dialog` or `Sheet` |
| Navigation | `Tabs` for sections, `DropdownMenu` for actions |
| Data tables | `Table` for system lists, assessments |
| Loading states | `Skeleton` |
| Notifications | `sonner` toast |
| Empty states | `empty-state` (custom) |

## Adding New Components

```bash
npx shadcn@latest add <component-name>
```

After adding, verify:
1. Component installed to `src/components/ui/`
2. Imports use `@/` alias
3. No conflicting dependencies
