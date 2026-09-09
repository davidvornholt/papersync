# PaperSync plugin for Super Productivity

Requires Super Productivity 18.21.2 or newer. Install the ZIP from PaperSync Settings under Super Productivity Settings → Plugins. Open the plugin settings and paste a connection key created in PaperSync. Connect one installation; SuperSync synchronizes its imported tasks to your other devices.

The plugin checks for approved homework at startup and every minute while the app is open. The “Import homework” header button also imports immediately and reports connection failures. Keys stay in Super Productivity’s local secret storage. Replacing or revoking a key in PaperSync invalidates the old connection.

Tasks carry a PaperSync ID in their notes. A retry finds that ID in active or archived tasks before creating anything. Completion is preserved, and archived tasks stay archived. Keep the marker in the task notes if you want retries to recognize the task. Edited wording on a later scan creates a distinct task, so check the review before approving it.

`src/api.ts` describes the methods this plugin uses from the [v18.21.2 host contract](https://github.com/super-productivity/super-productivity/blob/v18.21.2/packages/plugin-api/src/types.ts). The published `@super-productivity/plugin-api` package is older and lacks the supported HTTP and secret-storage APIs.

Run `bun run build` to generate `dist/papersync-plugin.zip`. The plugin has no environment variables. Its sole network destination is declared in `manifest.json` and `src/import-homework.ts`.
