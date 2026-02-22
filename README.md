# PaperSync

PaperSync is now organized as a Bun + Turborepo monorepo.

## Workspace Layout

- `apps/web`: Next.js application
- `packages/typescript-config`: Shared TypeScript configuration

## Getting Started

Install dependencies:

```bash
bun install
```

Run the app in development:

```bash
bun run dev
```

Run checks (Biome + type-check + tests) across the workspace:

```bash
bun run check:fix
```

Run tests:

```bash
bun run test
```
