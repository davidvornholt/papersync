'use client';

import { Data, Effect } from 'effect';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from '@/shared/hooks/use-settings';
import {
  type TestSuperProductivityResult,
  testSuperProductivityConnection,
} from '@/shared/vault/actions/super-productivity-actions';
import type { SuperProductivityConnectionStatus } from '../../components/settings-vault-super-productivity-panel';

class SuperProductivityTestError extends Data.TaggedError(
  'SuperProductivityTestError',
)<{
  readonly message: string;
}> {}

type AddToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
) => void;

const parseTagIds = (input: string): readonly string[] =>
  input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const joinTagIds = (tagIds: readonly string[] | undefined): string =>
  (tagIds ?? []).join(', ');

export const useSettingsScreenSuperProductivity = ({
  settings,
  updateVault,
  addToast,
}: {
  readonly settings: Settings;
  readonly updateVault: (updates: Partial<Settings['vault']>) => void;
  readonly addToast: AddToast;
}) => {
  const [tagIdsInput, setTagIdsInput] = useState<string>(() =>
    joinTagIds(settings.vault.superProductivityTagIds),
  );
  const [status, setStatus] = useState<SuperProductivityConnectionStatus>(
    settings.vault.superProductivityVerified ? 'ok' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isHydratedRef = useRef(false);

  // One-time hydration of the editable string from persisted settings.
  // Once the user starts typing, the string state owns truth and we stop
  // mirroring the settings array back into it.
  useEffect(() => {
    if (isHydratedRef.current) {
      return;
    }
    const tagIds = settings.vault.superProductivityTagIds;
    if (tagIds && tagIds.length > 0) {
      setTagIdsInput(joinTagIds(tagIds));
    }
    isHydratedRef.current = true;
  }, [settings.vault.superProductivityTagIds]);

  const handleChangeEndpoint = useCallback(
    (endpoint: string): void => {
      updateVault({
        superProductivityEndpoint: endpoint,
        superProductivityVerified: false,
      });
      setStatus('idle');
      setErrorMessage(null);
    },
    [updateVault],
  );

  const handleChangeProjectId = useCallback(
    (projectId: string): void => {
      updateVault({ superProductivityProjectId: projectId });
    },
    [updateVault],
  );

  const handleChangeTagIds = useCallback(
    (input: string): void => {
      setTagIdsInput(input);
      updateVault({ superProductivityTagIds: parseTagIds(input) });
    },
    [updateVault],
  );

  const handleTestConnection = useCallback((): void => {
    setStatus('testing');
    setErrorMessage(null);

    void Effect.runPromise(
      Effect.tryPromise({
        try: () =>
          testSuperProductivityConnection(
            settings.vault.superProductivityEndpoint,
          ),
        catch: (error) =>
          new SuperProductivityTestError({
            message:
              error instanceof Error
                ? error.message
                : 'Unable to reach Super Productivity',
          }),
      }).pipe(
        Effect.tap((result: TestSuperProductivityResult) =>
          Effect.sync(() => {
            if (result.ok) {
              setStatus('ok');
              setErrorMessage(null);
              updateVault({ superProductivityVerified: true });
              addToast('Super Productivity is reachable', 'success');
              return;
            }
            setStatus('failed');
            setErrorMessage(result.error);
            updateVault({ superProductivityVerified: false });
          }),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            setStatus('failed');
            setErrorMessage(error.message);
            updateVault({ superProductivityVerified: false });
          }),
        ),
      ),
    );
  }, [addToast, settings.vault.superProductivityEndpoint, updateVault]);

  return {
    superProductivityTagIdsInput: tagIdsInput,
    superProductivityStatus: status,
    superProductivityError: errorMessage,
    handleChangeSuperProductivityEndpoint: handleChangeEndpoint,
    handleChangeSuperProductivityProjectId: handleChangeProjectId,
    handleChangeSuperProductivityTagIds: handleChangeTagIds,
    handleTestSuperProductivityConnection: handleTestConnection,
  };
};
