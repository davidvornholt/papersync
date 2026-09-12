# PaperSync

> Built on [davidvornholt/standards](https://github.com/davidvornholt/standards).

Write homework on paper at school. At home, scan the sheet, check the recognized text and deadlines, and approve the tasks for Super Productivity. Click “Import homework” in the Super Productivity plugin and choose a project and tags by name; SuperSync distributes the imported tasks to your other devices.

PaperSync is open source and can be self-hosted. The web app requires PostgreSQL and a GitHub OAuth application restricted to one account. Hosted OCR uses Gemini 3.8 Flash at high reasoning through Google Cloud Enterprise AI, with a dedicated server-managed service account. Self-hosted instances can instead use a Google API key or an Ollama endpoint reachable from the server. Network scanners also resolve from the server running PaperSync.

The included Super Productivity plugin targets `papersync.vornholt.online`. Hosting that integration at another address currently requires changing its request URL and manifest host permission before building the plugin. Configurable plugin destinations are deferred.

## Development

Use Bun 1.4.2 and follow [the web app setup](apps/web/README.md) to start the database, generate the development environment, configure GitHub OAuth, and run migrations before starting the app.

```bash
bun install
bun run dev:web
```

Run `bun run check:fix` for formatting, lint, type checks, tests, production builds, and browser accessibility checks. The database must be running for integration tests.

## Workspace layout

- `apps/web`: Next.js application, scan review, authentication, and import queue API
- `apps/super-productivity-plugin`: task importer and installable ZIP
- `packages/db`: database schema, runtime, and generated migrations
- `packages/homework`: validated import contract and task identity
- `packages/ui`: shared components and theme
- `packages/typescript-config` and `packages/a11y-testing`: adopted standards packages

Production configuration, secrets, DNS, and digest-pinned deployment belong to [personal-infra](https://github.com/davidvornholt/personal-infra). PR preview sites are omitted by decision.

## License

PaperSync is licensed under the [MIT License](./LICENSE).
