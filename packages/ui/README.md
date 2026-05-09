# @papersync/ui

The PaperSync editorial design system as a reusable workspace package.

This package codifies the **feel** described in the root `DESIGN.md`: a
paper-first editorial atelier with warm cream stock, a single oxblood accent,
exacting Fraunces / DM Sans / JetBrains Mono typography, generous air, and
sharp 0px corners offset by best-in-class micro-interactions.

It does not declare *what* the product looks like screen by screen — it
provides the vocabulary every screen reaches for.

## What ships

Shared stylesheet and reusable React primitives:

- [`./src/theme.css`](./src/theme.css) — design tokens (`@theme inline`),
  base typography, editorial primitives (eyebrows, hairlines, the `serif` /
  `mono` voice classes, the `editorial-link` underline draw), the surface
  vocabulary (`paper-card`, `paper-flat`, `paper-section`), the button
  system (`btn-ink`, `btn-quiet`, `btn-ghost`, `btn-arrow`, `btn-sm/md/lg`),
  form primitives, focus states, the motion vocabulary (`paperRise`,
  `inkDraw`, `softFade` plus delay utilities), and the layout shells
  (`shell`, `shell-narrow`, `page-shell`).
- [`./src/components/button.tsx`](./src/components/button.tsx) — the small
  button API over the editorial button classes.
- [`./src/components/card.tsx`](./src/components/card.tsx) — paper-card
  surface primitives for app workflows.
- [`./src/components/editorial-header.tsx`](./src/components/editorial-header.tsx)
  — the shared app-screen header pattern.

## How to consume

Import the stylesheet from a Tailwind v4 entrypoint in a consuming app:

```css
@import "tailwindcss";
@import "@papersync/ui/theme.css";
```

The `@theme inline { … }` block inside `theme.css` is picked up by Tailwind v4
and exposes the tokens as utility classes (for example `bg-paper`,
`text-ink-soft`, `font-display`, `border-hairline`).

The named CSS classes (for example `.btn-ink`, `.editorial-eyebrow`,
`.serif-italic`, `.shell`) are available as plain class selectors and can be
used directly in JSX. Shared components are imported through explicit package
subpaths, not a barrel:

```tsx
import { Button } from '@papersync/ui/button';
import { Card, CardContent } from '@papersync/ui/card';
import { EditorialHeader } from '@papersync/ui/editorial-header';
```

## Environment variables

This package does not consume any environment variables.

## Scripts

- `bun run check-types` — type-check with `tsc --noEmit`.
- `bun run lint` — Biome with `--error-on-warnings`.
- `bun run lint:fix` — Biome with `--write --error-on-warnings`.
- `bun run test` — `bun test`.
