import { afterAll, afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
import { Effect } from 'effect';
import { defaultSettings } from '../settings/schema';
import { loadSettings, saveSettings } from './use-settings-storage';

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
);
let stored: string | null = null;
const fetchMock = spyOn(globalThis, 'fetch');
beforeEach(() => {
  stored = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  fetchMock.mockResolvedValue(Response.json({ revision: null, school: null }));
});
afterEach(() => {
  fetchMock.mockClear();
  if (originalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalStorage);
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

afterAll(() => fetchMock.mockRestore());

it('loads the server timetable ahead of stale browser data, retaining local AI settings', async () => {
  stored = JSON.stringify({
    ...defaultSettings,
    ai: { provider: 'ollama', ollamaEndpoint: 'http://localhost:11434' },
  });
  const school = {
    subjects: [{ id: 'spanish', name: 'Spanish' }],
    timetable: [{ day: 'monday' as const, subjectIds: ['spanish'] }],
  };
  fetchMock.mockResolvedValue(Response.json({ revision: 'remote', school }));
  const result = await Effect.runPromise(loadSettings());
  expect(result.revision).toBe('remote');
  expect(result.settings.subjects).toEqual(school.subjects);
  expect(result.settings.timetable).toEqual(school.timetable);
  expect(result.settings.ai.provider).toBe('ollama');
});

it('offers legacy browser subjects for the first save without writing on load', async () => {
  stored = JSON.stringify({
    ai: defaultSettings.ai,
    subjects: [{ id: 'math', name: 'Math' }],
  });
  const result = await Effect.runPromise(loadSettings());
  expect(result.revision).toBeNull();
  expect(result.settings.subjects).toEqual([{ id: 'math', name: 'Math' }]);
  expect(result.settings.timetable).toEqual(defaultSettings.timetable);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('sends only school data and the expected revision, then removes the browser timetable', async () => {
  const settings = {
    ...defaultSettings,
    ai: { ...defaultSettings.ai, googleApiKey: 'private-fixture-key' },
  };
  const school = { subjects: settings.subjects, timetable: settings.timetable };
  fetchMock.mockResolvedValue(Response.json({ revision: 'new', school }));
  expect(
    (await Effect.runPromise(saveSettings(settings, 'old'))).revision,
  ).toBe('new');
  const init = fetchMock.mock.calls[0]?.[1];
  expect(JSON.parse(String(init?.body))).toEqual({ revision: 'old', school });
  expect(stored).toBe(JSON.stringify({ ai: settings.ai }));
});

it('preserves the local migration source and reports a stale save', async () => {
  fetchMock.mockResolvedValue(
    Response.json({ error: 'Reload before saving.' }, { status: 409 }),
  );
  const result = await Effect.runPromise(
    saveSettings(defaultSettings, null).pipe(Effect.either),
  );
  expect(result._tag).toBe('Left');
  expect(JSON.parse(stored ?? '{}').subjects).toEqual(defaultSettings.subjects);
});

it('does not substitute defaults when the server is unavailable', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  expect(
    (await Effect.runPromise(loadSettings().pipe(Effect.either)))._tag,
  ).toBe('Left');
});
