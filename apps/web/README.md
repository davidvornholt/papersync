# @papersync/web

Next.js web application for PaperSync.

## Environment variables

Bun loads `.env` files automatically. Copy `.env.example` when you want local overrides:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Required | Used by | Behavior and safe local example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | No | Browser/client runtime | Optional GitHub OAuth device-flow client ID for connecting a user-owned GitHub repository as a vault. When unset, GitHub OAuth is shown as unconfigured and local vault workflows still work. Safe example: `NEXT_PUBLIC_GITHUB_CLIENT_ID=` |
| `TMPDIR` | No | Tests/local tooling via the OS/Bun environment | Optional temporary directory root used by filesystem tests. Defaults to `/tmp` when unset. Safe example: `TMPDIR=/tmp` |

PaperSync is self-hosted and bring-your-own-key only. Do not put PaperSync-owned SaaS subscription credentials here; users provide their own provider credentials or local endpoints.

## Scripts

```bash
bun run dev
bun run lint
bun run check-types
bun run test
```
