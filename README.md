# PaperSync

Scan handwritten homework, review the recognized tasks, and approve them for Super Productivity. Connect one installation; SuperSync distributes imported tasks to your other devices.

## Development

Use the Bun version in `package.json`. From the repository root:

```sh
bun install
just dev-db-start
bun standards dev-env
bun run --cwd packages/db db:migrate
bun run dev:web
```

Configure a development GitHub OAuth application with callback `http://localhost:3000/api/auth/callback/github`. Configuration lives in `config/dev.yaml` and `secrets/dev.example.yaml`; encrypted values belong in `secrets/dev.yaml`, and machine overrides in ignored `config/dev.local.yaml`.

Run `bun run check:fix` with the database running. After schema changes, run `bun run --cwd packages/db db:generate` and apply the generated migration.

## Hosting and integration

[personal-infra](https://github.com/davidvornholt/personal-infra) owns the hosted deployment. Self-hosting requires PostgreSQL and a GitHub OAuth application restricted to one numeric account ID. Configure all three managed Google Vertex values together to use server-owned OCR; omit all three to enable local Google API key or Ollama settings. Ollama endpoints and network scanners must be reachable from the server.

Photos and unapproved OCR results are not persisted. Approved tasks remain in PostgreSQL for import and duplicate detection. Subjects and the weekly timetable are stored in PostgreSQL and shared across signed-in browsers. AI preferences and credentials remain browser-local and are not part of a database backup. When no server timetable exists, settings offers the current browser’s subjects and timetable for the first save; after that, the server copy takes precedence. Concurrent edits require reloading before saving over another browser’s change.

See the [Super Productivity plugin instructions](apps/super-productivity-plugin/README.md) for installation and changing its deployment address.

## PR screenshots

Capture matched before/after images with demo data, then run `bun standards screenshots publish <image.png>` from the repository root. Publishing uses the [configured shared screenshot bucket](config/screenshots.yaml) and PaperSync's encrypted credential. The returned Markdown links are public and permanent; follow the [screenshot skill](.agents/skills/screenshots-in-prs/SKILL.md) when adding them to a PR.

## License

[MIT](LICENSE).
