---
applyTo: "src/components/**"
---

# Component Instructions

## Structure

- Multiple components per file are fine for local/helper components; extract to a separate file when reused elsewhere
- Props type defined at the top of the file
- Hooks at the top of the component body
- Early returns for guard clauses before main render

## Styling & Design Tokens

- Tailwind CSS only — never use inline `style` prop
- Use `cn()` from `~/utils/utils` to merge conditional classes
- Use `tailwind-variants` (`tv()`) for component variant definitions
- Dark mode: use `dark:` prefix classes, theme uses OKLCH colors
- Mobile-first: base styles for mobile, `sm:`, `md:`, `lg:` for larger screens
- Always use semantic token classes (`bg-background`, `text-foreground`, `border-border`, etc.) — never hardcode color values like `bg-gray-50` or `text-gray-900`
- Design tokens are defined in `src/styles/tokens/` (primitives → semantic → component layers)

## Data

- Consume data via `useQuery()` or `useSuspenseQuery()` — never call server functions directly from components
- Forms use `@tanstack/react-form` with `useForm()` hook
- Mutations via custom hooks that wrap `useMutation()`

## Accessibility

- Use Radix UI primitives from `src/components/ui/` for interactive patterns (dialog, select, checkbox, etc.)
- Ensure keyboard navigation works
- Include `aria-label` on icon-only buttons

## Drag and Drop

- Drag-and-drop items receive `dragAttributes` and `dragListeners` as props
- Use dnd-kit `useSortable` hook in the parent list, pass down to items
- Wrap drag handle buttons with `{...dragListeners}` and `{...dragAttributes}`
- Hydration guard: wrap sortable lists in `useEffect` state check to avoid SSR mismatch
