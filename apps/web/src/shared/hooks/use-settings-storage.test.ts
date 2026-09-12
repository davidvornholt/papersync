import { afterEach, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { defaultSettings } from './use-settings-schema';
import { loadSettings, saveSettings } from './use-settings-storage';

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
);
afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalStorage);
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
it('round-trips settings through browser storage and falls back on invalid saved data', async () => {
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  await Effect.runPromise(saveSettings(defaultSettings));
  expect(await Effect.runPromise(loadSettings())).toEqual(defaultSettings);
  stored = '{broken';
  expect(await Effect.runPromise(loadSettings())).toEqual(defaultSettings);
});
it('migrates legacy settings without a timetable while preserving saved values', async () => {
  const stored = JSON.stringify({
    vault: {
      method: 'local',
      localPath: '/school/vault',
      githubConnected: true,
      githubRepo: 'student/homework',
      githubUsername: 'student',
      superProductivityEndpoint: 'http://127.0.0.1:3876',
      superProductivityProjectId: 'project-1',
      superProductivityTagIds: ['homework'],
      superProductivityVerified: true,
    },
    ai: {
      provider: 'ollama',
      googleApiKey: '',
      ollamaEndpoint: 'http://localhost:11434',
    },
    subjects: [{ id: 'math', name: 'Mathematics', color: '#123456' }],
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => stored,
    },
  });

  const loaded = await Effect.runPromise(loadSettings());

  expect(loaded).not.toHaveProperty('vault');
  expect(loaded.ai).toEqual({
    provider: 'ollama',
    googleApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
  });
  expect(loaded.subjects).toEqual([
    { id: 'math', name: 'Mathematics', color: '#123456' },
  ]);
  expect(loaded.timetable).toEqual(defaultSettings.timetable);
});
it('reports a storage failure instead of returning a successful save', async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      setItem: () => {
        throw new DOMException('Storage full', 'QuotaExceededError');
      },
    },
  });
  const result = await Effect.runPromise(
    saveSettings(defaultSettings).pipe(Effect.either),
  );
  expect(result._tag).toBe('Left');
});
