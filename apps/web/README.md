# PaperSync web app

Write homework on the printed sheet at school. At home, photograph or upload the sheet, check its week, review the recognized text and due dates, then approve the entries. Photos are processed for that request and are not stored in the homework queue. JPEG, PNG, and WebP images up to 10 MB are supported; export HEIC photos as JPEG first.

## Development

Use the exact Bun version declared at the repository root. Run `bun install`, `just dev-db-start`, and `bun standards dev-env` from the root, then run the database workspace's `db:migrate` script and `bun run dev:web`. Set up a separate development GitHub OAuth application with callback `http://localhost:3000/api/auth/callback/github`.

Plain development configuration lives in `config/dev.yaml`; secret configuration is documented in `secrets/dev.example.yaml` and stored encrypted in `secrets/dev.yaml`. Generate `.env.local` with `bun standards dev-env`; do not edit generated files. Production configuration and secrets belong to `davidvornholt/personal-infra`.

GitHub sign-in admits only the configured numeric GitHub account ID. It is separate from the optional GitHub device flow for connecting an Obsidian repository. The app requires a database for its hosted import queue. Local vault paths, Ollama endpoints, and network scanners resolve from the server running PaperSync.

The workspace's `.env.example` is a safe reference, not a deployment source. `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWED_ACCOUNT_ID`, and `DATABASE_URL` are required without defaults. The session secret must contain at least 32 characters. `NEXT_PUBLIC_GITHUB_CLIENT_ID` is optional and defaults to an empty string, disabling the separate repository device flow. `PLUGIN_ARCHIVE_PATH` defaults to `../super-productivity-plugin/dist/papersync-plugin.zip`.

Next.js owns `PORT`, `HOSTNAME`, and `NODE_ENV`; its development command defaults to port 3000, while production wiring explicitly provides its bind address and environment. The OS supplies `HOME`, `PATH`, and `TZ` for tooling, executable lookup, and local-time behavior; production uses `/tmp` as HOME and Europe/Berlin as TZ. Playwright reads `CI` to select CI reporting, forbid focused tests, and enable its configured retry. `GOOGLE_VERTEX_API_KEY` appears only in an isolated regression test proving that managed OCR ignores express-mode credentials.

## Google Cloud AI

Production uses Gemini 3.8 Flash at high reasoning through Google Cloud Enterprise AI, using the Vertex API. Credentials stay on the server. The model does not fall back to a smaller Gemini model. Google Cloud receives the image only when extraction is requested; approval still follows review.

Set `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION` (`global`, `eu`, or `us`), and the secret `GOOGLE_VERTEX_CREDENTIALS_JSON` together. Each is required for managed OCR and has no default. The credential is a one-line service-account JSON with `type`, `client_email`, and `private_key`. Any partial configuration fails extraction rather than using a browser-selected provider. Settings hides local AI controls when server configuration is present. With all three omitted, self-hosted instances can use their local Google API key or Ollama settings. Development declarations live in `config/dev.yaml` and `secrets/dev.example.yaml`; production values live in personal-infra.

## Super Productivity

In Settings, select Super Productivity, fetch the plugin ZIP, and create a connection key. Install the ZIP in Super Productivity and configure the plugin with the key. Connect one installation; SuperSync syncs the imported tasks to your other devices. Keep Super Productivity open to import approved entries automatically, or use its PaperSync import action.

The same week, written day, subject, and normalized text identify a repeated entry. Repeating an unchanged scan does not create another task. A due date correction updates the task; changing its wording creates a new entry. Review the recognized text before approval. Completed or archived Super Productivity tasks stay completed. Keep the PaperSync marker in task notes so interrupted imports can safely retry.

## Verification

`bun run check:fix` at the root runs the full gate, including isolated PostgreSQL queue checks and authenticated desktop and mobile accessibility checks. Start the development database before running it. Browser server configs set all three managed OCR variables explicitly to empty strings; empty or whitespace-only values are treated as absent, so host variables and Next.js dotenv files cannot select Vertex in the local fixture suite. The second browser pass sets only a fixture `GOOGLE_VERTEX_PROJECT`; its location and credentials stay empty, so it verifies managed Settings without credentials or live model calls. Browser checks create signed test sessions using isolated fixture credentials; they do not bypass authorization. Live GitHub OAuth and paid OCR providers require their real credentials and are not simulated as successful live integrations.

PR preview sites are omitted by user decision. Production is authenticated; browser and container smoke checks cover pull requests.
