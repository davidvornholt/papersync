import { readFile } from 'node:fs/promises';
import { Config, Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
export const GET = async () => {
  await requireSession();
  const path = await Effect.runPromise(
    Config.string('PLUGIN_ARCHIVE_PATH').pipe(
      Config.withDefault(
        '../super-productivity-plugin/dist/papersync-plugin.zip',
      ),
    ),
  );
  const data = await readFile(path);
  return new Response(data, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="papersync-plugin.zip"',
      'cache-control': 'private, no-store',
    },
  });
};
