---
description: 'Create a new React component'
mode: 'agent'
---

# Create Component

Create a new React component following the project conventions.

## Pattern

```typescript
import { cn } from '~/utils/utils'

type MyComponentProps = {
  // Props with explicit types — no `any`
}

export const MyComponent = ({ ...props }: MyComponentProps) => {
  // Early returns for guard clauses
  // Hooks at the top

  return (
    <div className={cn('base-classes', conditionalClass && 'conditional')}>
      {/* JSX */}
    </div>
  )
}
```

## Rules

- One component per file in `src/components/`
- Named export, no default export
- PascalCase filename matching component name
- Use Tailwind CSS for all styling — no inline styles
- Use `tailwind-variants` for variants, `cn`/`twMerge` for conditional classes
- Use Radix primitives from `src/components/ui/` for accessible patterns
- Data fetching via `useQuery` / `useSuspenseQuery` — never fetch in components directly
- For drag-and-drop items, accept `dragAttributes` and `dragListeners` as props
- Hydration-aware components: use `useEffect` + state guard for client-only behavior
