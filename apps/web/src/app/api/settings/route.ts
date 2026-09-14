import { databaseRuntime } from '@papersync/db/runtime';
import { Config, Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import {
  loadSchoolSettings,
  SchoolSettingsError,
  saveSchoolSettings,
} from '@/shared/settings/repository';

export const GET = async (): Promise<Response> => {
  await requireSession();
  return databaseRuntime.runPromise(
    loadSchoolSettings.pipe(
      Effect.match({
        onFailure: (error) =>
          Response.json({ error: error.message }, { status: error.status }),
        onSuccess: (settings) =>
          Response.json(settings, { headers: { 'Cache-Control': 'no-store' } }),
      }),
    ),
  );
};

export const PUT = async (request: Request): Promise<Response> => {
  await requireSession();
  const publicUrl = await Effect.runPromise(Config.url('BETTER_AUTH_URL'));
  if (request.headers.get('origin') !== publicUrl.origin) {
    return Response.json(
      { error: 'Save your timetable from PaperSync.' },
      { status: 403 },
    );
  }
  return databaseRuntime.runPromise(
    Effect.tryPromise({
      try: () => request.json() as Promise<unknown>,
      catch: () =>
        new SchoolSettingsError({
          message: 'Send a valid timetable.',
          status: 400,
        }),
    }).pipe(
      Effect.flatMap(saveSchoolSettings),
      Effect.match({
        onFailure: (error) =>
          Response.json({ error: error.message }, { status: error.status }),
        onSuccess: (settings) => Response.json(settings),
      }),
    ),
  );
};
