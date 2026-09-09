# PaperSync web app

Write homework on the printed sheet at school. At home, photograph or upload the sheet, check its week, review the recognized text and due dates, then approve the entries. Photos are processed for that request and are not stored in the homework queue. JPEG, PNG, and WebP images up to 10 MB are supported; export HEIC photos as JPEG first.

## Development

Use the exact Bun version declared at the repository root. Run `bun install`, `just dev-db-start`, and `bun standards dev-env` from the root, then run the database workspace's `db:migrate` script and `bun run dev:web`. Set up a separate development GitHub OAuth application with callback `http://localhost:3000/api/auth/callback/github`.

Plain development configuration lives in `config/dev.yaml`; secret configuration is documented in `secrets/dev.example.yaml` and stored encrypted in `secrets/dev.yaml`. Generate `.env.local` with `bun standards dev-env`; do not edit generated files. Production configuration and secrets belong to `davidvornholt/personal-infra`.

GitHub sign-in admits only the configured numeric GitHub account ID. It is separate from the optional GitHub device flow for connecting an Obsidian repository. The app requires a database for its hosted import queue. Local vault paths, Ollama endpoints, and network scanners resolve from the server running PaperSync.

## Super Productivity

In Settings, select Super Productivity, fetch the plugin ZIP, and create a connection key. Install the ZIP in Super Productivity and configure the plugin with the key. Connect one installation; SuperSync syncs the imported tasks to your other devices. Keep Super Productivity open to import approved entries automatically, or use its PaperSync import action.

The same week, written day, subject, and normalized text identify a repeated entry. Repeating an unchanged scan does not create another task. A due date correction updates the task; changing its wording creates a new entry. Review the recognized text before approval. Completed or archived Super Productivity tasks stay completed. Keep the PaperSync marker in task notes so interrupted imports can safely retry.

## Verification

`bun run check:fix` at the root runs the full gate, including isolated PostgreSQL queue checks and authenticated desktop and mobile accessibility checks. Start the development database before running it. Browser checks create signed test sessions using isolated fixture credentials; they do not bypass authorization. Live GitHub OAuth and paid OCR providers require their real credentials and are not simulated as successful live integrations.

PR preview sites are omitted by user decision. Production is authenticated; browser and container smoke checks cover pull requests.
