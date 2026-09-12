import { Effect } from 'effect';
import type { PluginApi } from './api';
import { configure } from './configure';
import { importHomework } from './import-homework';
import { createImportController } from './import-lifecycle';

declare const PluginAPI: PluginApi;
declare const plugin: {
  readonly onUnload: (callback: () => void) => void;
};

const semaphore = Effect.runSync(Effect.makeSemaphore(1));
const importController = createImportController();
const runImport = () =>
  semaphore.withPermits(1)(
    importHomework(PluginAPI).pipe(
      Effect.match({
        onFailure: (error) => {
          PluginAPI.showSnack({ msg: error.message, type: 'ERROR' });
        },
        onSuccess: (count) => {
          if (count !== null) {
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
    importController.start(runImport());
  },
});
plugin.onUnload(() => {
  importController.stop();
});
