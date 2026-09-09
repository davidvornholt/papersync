# PaperSync database

Drizzle owns the PostgreSQL schema and generated migrations. Runtime queries use Effect SQL through the shared managed runtime.

Start the development database with `just dev-db-start`, generate `.env.local` with `bun standards dev-env`, then run `bun run db:migrate` from this workspace. After changing `src/schema.ts`, run `bun run db:generate` and review the generated migration.

Production runs `bun run db:migrate:deploy` before starting the app. `DATABASE_URL` is a required PostgreSQL connection URI, including Unix socket connections. Local development ownership lives in `config/dev.yaml`; production owns it in personal-infra.
