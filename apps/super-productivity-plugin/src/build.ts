import { build, file, write } from 'bun';
import { Data, Effect } from 'effect';
import { strToU8, zipSync } from 'fflate';

class BuildError extends Data.TaggedError('BuildError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
const buildPlugin = Effect.gen(function* () {
  const result = yield* Effect.tryPromise({
    try: () =>
      build({
        entrypoints: ['./src/plugin.ts'],
        target: 'browser',
        format: 'iife',
        minify: true,
      }),
    catch: (cause) =>
      new BuildError({
        message: 'Could not build the PaperSync plugin.',
        cause,
      }),
  });
  if (!(result.success && result.outputs[0])) {
    return yield* Effect.fail(
      new BuildError({
        message: 'The plugin build failed. Check the source diagnostics.',
        cause: result.logs,
      }),
    );
  }
  const [output] = result.outputs;
  const bundle = yield* Effect.promise(() => output.text());
  const manifest = yield* Effect.promise(() => file('./manifest.json').text());
  const archive = zipSync({
    'plugin.js': strToU8(bundle),
    'manifest.json': strToU8(manifest),
  });
  yield* Effect.tryPromise({
    try: () => write('./dist/papersync-plugin.zip', archive),
    catch: (cause) =>
      new BuildError({ message: 'Could not save the plugin ZIP.', cause }),
  });
});
await Effect.runPromise(buildPlugin);
