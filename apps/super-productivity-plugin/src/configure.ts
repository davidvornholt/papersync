import { Effect } from 'effect';
import type { PluginApi } from './api';
import { ImportError } from './error';
import { secretKey } from './import-homework';
export const configure = (api: PluginApi) => {
  const inputId = `papersync-key-${crypto.randomUUID()}`;
  return Effect.tryPromise({
    try: () =>
      api.openDialog({
        title: 'Connect PaperSync',
        htmlContent: `<p>Create a connection key in PaperSync Settings, then paste it here. The key is stored on this device.</p><label for="${inputId}">Connection key</label><input id="${inputId}" type="password" autocomplete="off" style="width:100%" />`,
        buttons: [
          { label: 'Cancel' },
          {
            label: 'Save',
            onClick: () => {
              const input = globalThis.document.querySelector<HTMLInputElement>(
                `#${inputId}`,
              );
              if (!(input instanceof HTMLInputElement && input.value.trim())) {
                return;
              }
              const value = input.value.trim();
              Effect.runFork(
                Effect.tryPromise({
                  try: () => api.setSecret(secretKey, value),
                  catch: (cause) =>
                    new ImportError({
                      message: 'Could not store the connection key.',
                      cause,
                    }),
                }).pipe(
                  Effect.match({
                    onFailure: (error) =>
                      api.showSnack({ msg: error.message, type: 'ERROR' }),
                    onSuccess: () =>
                      api.showSnack({
                        msg: 'PaperSync connected. Use Import homework to fetch your tasks.',
                        type: 'SUCCESS',
                      }),
                  }),
                ),
              );
            },
          },
        ],
      }),
    catch: (cause) =>
      new ImportError({ message: 'Could not open PaperSync settings.', cause }),
  });
};
