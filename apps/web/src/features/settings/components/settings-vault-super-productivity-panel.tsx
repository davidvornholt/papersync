'use client';

import { Effect, Fiber } from 'effect';
import { CircleHelp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createConnectionKey,
  getConnectionStatus,
  removeConnectionKey,
} from '@/shared/homework/actions';
import { HomeworkError } from '@/shared/homework/error';

type PanelProps = {
  readonly projectId: string;
  readonly tagIdsInput: string;
  readonly onChangeProjectId: (value: string) => void;
  readonly onChangeTagIds: (value: string) => void;
};
export const SettingsVaultSuperProductivityPanel = ({
  projectId,
  tagIdsInput,
  onChangeProjectId,
  onChangeTagIds,
}: PanelProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    readonly isConnected: boolean;
    readonly pendingCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const run = (operation: () => Promise<unknown>) => {
    setIsBusy(true);
    setError(null);
    Effect.runFork(
      Effect.tryPromise({
        try: operation,
        catch: (cause) =>
          new HomeworkError({
            message: 'Could not change the plugin connection. Retry shortly.',
            cause,
          }),
      }).pipe(
        Effect.catchAll((cause) => Effect.sync(() => setError(cause.message))),
        Effect.ensuring(Effect.sync(() => setIsBusy(false))),
      ),
    );
  };
  useEffect(() => {
    const fiber = Effect.runFork(
      Effect.tryPromise({
        try: getConnectionStatus,
        catch: (cause) =>
          new HomeworkError({
            message: 'Could not check the homework queue. Reload to try again.',
            cause,
          }),
      }).pipe(
        Effect.tap((value) => Effect.sync(() => setStatus(value))),
        Effect.catchAll((cause) => Effect.sync(() => setError(cause.message))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);
  return (
    <div className="space-y-4">
      <p>
        Install the PaperSync plugin in Super Productivity, then paste a
        connection key into its settings. Approved tasks wait here until the
        plugin imports them.
      </p>
      <details className="border border-hairline bg-paper p-4">
        <summary className="cursor-pointer font-medium text-sm">
          <CircleHelp
            size={16}
            aria-hidden={true}
            className="mr-2 inline-block align-text-bottom"
          />
          How the plugin works
        </summary>
        <div className="mt-3 space-y-3 text-graphite text-sm">
          <p>
            Scan your paper at home, review the homework, and approve it.
            Approved homework waits in PaperSync until Super Productivity is
            open.
          </p>
          <p>
            Install the ZIP under Super Productivity Settings → Plugins, then
            paste a connection key into the plugin settings. It connects to
            papersync.vornholt.online and checks at startup and
            every minute while Super Productivity is open. Use its “Import
            homework” button to check immediately.
          </p>
          <p>
            The plugin creates tasks with due dates. Connect one Super
            Productivity installation; SuperSync then shares those tasks with
            your other devices. PaperSync does not need access to your
            computer's files, and homework stays queued while Super Productivity
            is closed.
          </p>
        </div>
      </details>
      <a href="/api/plugin" className="inline-block underline">
        Get the PaperSync plugin ZIP
      </a>
      {status ? (
        <p role="status">
          {status.isConnected
            ? 'Connection key active.'
            : 'No plugin connection yet.'}{' '}
          {status.pendingCount} tasks waiting to import.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <fieldset disabled={isBusy} className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-ink btn-md"
            onClick={() =>
              run(() =>
                createConnectionKey().then((value) => {
                  setToken(value);
                  setStatus((previous) => ({
                    isConnected: true,
                    pendingCount: previous?.pendingCount ?? 0,
                  }));
                }),
              )
            }
          >
            Create connection key
          </button>
          <button
            type="button"
            className="btn-quiet btn-md"
            onClick={() =>
              run(() =>
                removeConnectionKey().then(() => {
                  setToken(null);
                  setStatus((previous) => ({
                    isConnected: false,
                    pendingCount: previous?.pendingCount ?? 0,
                  }));
                }),
              )
            }
          >
            Revoke connection
          </button>
        </div>
        <p className="text-graphite text-sm">
          Creating a key replaces the previous key. Connect one Super
          Productivity installation; SuperSync shares its imported tasks with
          your other devices.
        </p>
        {token ? (
          <label className="block text-sm">
            Connection key, shown once
            <input
              readOnly={true}
              value={token}
              className="mt-1 w-full border border-hairline bg-paper p-2"
              onFocus={(event) => event.target.select()}
            />
          </label>
        ) : null}
        <label className="block text-sm">
          Project ID (optional)
          <input
            value={projectId}
            onChange={(event) => onChangeProjectId(event.target.value)}
            className="mt-1 w-full border border-hairline bg-paper p-2"
          />
        </label>
        <label className="block text-sm">
          Tag IDs (optional, comma separated)
          <input
            value={tagIdsInput}
            onChange={(event) => onChangeTagIds(event.target.value)}
            className="mt-1 w-full border border-hairline bg-paper p-2"
          />
        </label>
      </fieldset>
    </div>
  );
};
