import { Effect, Fiber } from 'effect';

type ImportEffect = Effect.Effect<void, never>;

export const createImportController = () => {
  const activeImports = new Set<Fiber.Fiber<void, never>>();

  const start = (importEffect: ImportEffect) => {
    const fiber = Effect.runFork(importEffect);
    activeImports.add(fiber);
    Effect.runFork(
      fiber.await.pipe(
        Effect.ensuring(Effect.sync(() => activeImports.delete(fiber))),
      ),
    );
  };

  const stop = () => {
    const fibers = [...activeImports];
    activeImports.clear();
    return Effect.runFork(Fiber.interruptAll(fibers));
  };

  return { start, stop };
};
