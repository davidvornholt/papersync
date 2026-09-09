# Review decisions registry

Durable, already-litigated review decisions. How reviewers must treat entries and when orchestrators append them is defined in the `review` and `review-fix` skills.

Entry format: heading `### D-NNN (date, status) — title`, where status is `decided` or `open`, followed by the decision and its rationale in prose. Entries are never edited silently; superseding an entry means a new entry that references the old id.

## Entries

### D-001 (2026-09-09, decided) — Authenticated production without preview sites

The user chose to omit PR preview sites for now. PaperSync serves private homework and has GitHub account allowlisting in production. Browser checks and container smoke checks run in CI instead. Revisit isolated, authenticated previews when they provide enough value to justify their infrastructure and OAuth configuration.

### D-002 (2026-09-09, decided) — Super Productivity plugin import

The user approved an installable Super Productivity plugin that imports approved homework from PaperSync. Connect one Super Productivity installation; SuperSync distributes its tasks to the other devices. Matching repeated scans use sheet week, written day, subject, and normalized text. Due date and completion corrections update that identity; changed wording is a new entry and remains reviewable before approval.

### D-003 (2026-09-09, decided) — Plugin destination scope

This deployment and its bundled plugin target `papersync.vornholt.online`, the address requested by the user. A self-hosted installation at another address requires rebuilding the plugin with the matching request URL and manifest host permission. Configurable plugin destinations are deferred; documentation must state this limitation rather than imply that the distributed ZIP connects to arbitrary deployments.
