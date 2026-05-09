# PaperSync

PaperSync is a free and open source self-hosted tool for turning scanned schoolwork into an organized local-first homework workflow.

PaperSync is bring-your-own-key only: you provide any third-party API keys or local model endpoints you choose to use. There is no PaperSync monthly subscription, hosted SaaS plan, or vendor-hosted account requirement. Everybody can self-host PaperSync on their own hardware.

## Workspace layout

- `apps/web`: Next.js application
- `packages/typescript-config`: Shared TypeScript configuration

## Getting started

Install dependencies:

```bash
bun install
```

Run the web app in development:

```bash
bun run dev:web
```

Run checks (Biome, type-checking, and tests) across the workspace:

```bash
bun run check
```

Apply safe formatting/import fixes, then type-check and test:

```bash
bun run check:fix
```
