# Design Token System

This app uses a layered CSS custom property system for theming. All tokens live in `src/styles/tokens/` and are consumed via Tailwind CSS utility classes.

## Token Layers

Tokens are imported in order — each layer builds on the previous:

```
primitive.css → scale.css → semantic.css → component.css
```

### 1. Primitives (`tokens/primitive.css`)

Raw OKLCH palette values with no semantic meaning. Named by hue and shade.

```css
--primitive-slate-900: oklch(0.208 0.042 265.755);
--primitive-red-500: oklch(0.637 0.237 25.331);
```

**Rule:** Never reference primitives directly in components — always go through semantic tokens.

### 2. Scale (`tokens/scale.css`)

Non-color foundational values: spacing, typography, and elevation.

```css
--spacing-sm: 0.5rem;
--font-size-lg: 1.125rem;
--shadow-md: 0 4px 6px -1px oklch(0 0 0 / 10%), ...;
```

Shadow tokens are bridged into Tailwind via `@theme inline` in `app.css` (e.g., `shadow-sm`, `shadow-lg`). Spacing tokens (`--spacing-xs` through `--spacing-2xl`) extend Tailwind's built-in spacing scale.

### 3. Semantic (`tokens/semantic.css`)

Role-based aliases that map primitives to functional roles. These are what components consume (via Tailwind classes like `bg-background`, `text-foreground`, `border-border`).

```css
/* Light (default) */
:root {
  --background: var(--primitive-white);
  --foreground: var(--primitive-slate-950);
  --destructive: var(--primitive-red-500);
}

/* Dark */
.dark {
  --background: var(--primitive-slate-950);
  --foreground: var(--primitive-slate-50);
  --destructive: var(--primitive-red-400);
}
```

The `@theme inline` block in `app.css` bridges these into Tailwind's color system (e.g., `--color-background: var(--background)`).

### 4. Component (`tokens/component.css`)

Optional tokens for complex, multi-element components. Reference semantic tokens and group related values.

```css
--task-drag-handle: var(--muted-foreground);
--task-drag-handle-hover: var(--foreground);
```

Only add component tokens when a pattern has 3+ related style values that benefit from co-location.

## Creating a New Theme

1. Add a new CSS selector in `semantic.css` that remaps semantic tokens to different primitives:

```css
.theme-nord {
  --background: var(--primitive-nord-polar-night);
  --foreground: var(--primitive-nord-snow-storm);
  /* ... remap all semantic tokens */
}
```

2. Apply the class to `<html>` (replacing or alongside `.dark`).

That's it — all components automatically pick up the new values.

## Adding New Tokens

1. **New color?** Add the raw OKLCH value to `primitive.css`, then create a semantic alias in `semantic.css` (both `:root` and `.dark`), then bridge it in the `@theme inline` block in `app.css`.
2. **New spacing/typography/shadow?** Add to `scale.css`. Shadow tokens need a corresponding `@theme inline` entry in `app.css`.
3. **New component pattern?** Add to `component.css`, referencing semantic tokens. Consume in components via `text-(--token-name)` or `bg-(--token-name)` Tailwind syntax.

## Dark Mode

Dark/light mode follows the OS system preference. An inline script in `__root.tsx` detects `prefers-color-scheme: dark` and toggles the `.dark` class on `<html>`. The `@custom-variant dark` in `app.css` makes Tailwind's `dark:` prefix work with this class.

## File Reference

| File | Purpose |
|---|---|
| `tokens/primitive.css` | Raw OKLCH palette values |
| `tokens/scale.css` | Spacing, typography, elevation |
| `tokens/semantic.css` | Role-based light/dark theme mappings |
| `tokens/component.css` | Optional component-level tokens |
| `app.css` | Imports, `@theme inline` bridge, base styles |
