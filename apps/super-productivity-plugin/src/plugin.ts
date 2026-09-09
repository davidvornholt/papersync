import { Effect, Fiber, Schedule } from 'effect';
import type { PluginApi } from './api';
import { configure } from './configure';
import { importHomework } from './import-homework';

declare const PluginAPI: PluginApi;
declare const plugin: {
  readonly onReady: (callback: () => void) => void;
  readonly onUnload: (callback: () => void) => void;
};

const semaphore = Effect.runSync(Effect.makeSemaphore(1));
const runImport = (isManual: boolean) =>
  semaphore.withPermits(1)(
    importHomework(PluginAPI).pipe(
      Effect.match({
        onFailure: (error) => {
          if (isManual) {
            PluginAPI.showSnack({ msg: error.message, type: 'ERROR' });
          }
        },
        onSuccess: (count) => {
          if (count > 0 || isManual) {
            PluginAPI.showSnack({
              msg:
                count > 0
                  ? `Imported ${count} homework tasks.`
                  : 'No new homework. Check your connection in the plugin settings if tasks are still waiting.',
              type: 'INFO',
            });
          }
        },
      }),
    ),
  );
PluginAPI.registerConfigHandler(() => {
  Effect.runFork(configure(PluginAPI));
});
PluginAPI.registerHeaderButton({
  label: 'Import homework',
  icon: 'assignment',
  onClick: () => {
    Effect.runFork(runImport(true));
  },
});
plugin.onReady(() => {
  const fiber = Effect.runFork(
    runImport(false).pipe(Effect.repeat(Schedule.spaced('60 seconds'))),
  );
  plugin.onUnload(() => {
    Effect.runFork(Fiber.interrupt(fiber));
  });
});
