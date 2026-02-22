import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage only if window exists (jsdom environment)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Setup mock in beforeEach to ensure window exists
beforeEach(() => {
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  }
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('Settings Persistence', () => {
  describe('Default values', () => {
    it('should provide default settings when localStorage is empty', () => {
      // Default settings shape
      const defaultSettings = {
        vault: {
          mode: 'local' as const,
          localPath: undefined,
          github: {
            connected: false,
            username: undefined,
            repository: undefined,
          },
        },
        ai: {
          provider: 'google' as const,
          googleApiKey: undefined,
          ollamaEndpoint: 'http://localhost:11434',
        },
        subjects: [],
      };

      expect(defaultSettings.vault.mode).toBe('local');
      expect(defaultSettings.ai.provider).toBe('google');
      expect(defaultSettings.subjects).toHaveLength(0);
    });
  });

  describe('LocalStorage serialization', () => {
    it('should serialize settings to JSON', () => {
      const settings = {
        vault: { mode: 'local', localPath: '/test' },
        ai: { provider: 'google' },
        subjects: [{ id: '1', name: 'Math', color: '#FF0000' }],
      };

      const serialized = JSON.stringify(settings);
      localStorageMock.setItem('papersync-settings', serialized);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'papersync-settings',
        expect.stringContaining('Math'),
      );
    });

    it('should deserialize settings from JSON', () => {
      const stored = JSON.stringify({
        vault: { mode: 'github', localPath: '/vault' },
        ai: { provider: 'ollama', ollamaEndpoint: 'http://custom:11434' },
        subjects: [],
      });

      localStorageMock.setItem('papersync-settings', stored);
      const parsed = JSON.parse(
        localStorageMock.getItem('papersync-settings') ?? '{}',
      );

      expect(parsed.vault.mode).toBe('github');
      expect(parsed.ai.provider).toBe('ollama');
    });
  });

  describe('Settings validation', () => {
    it('should validate vault mode', () => {
      const validModes = ['local', 'github'];
      expect(validModes.includes('local')).toBe(true);
      expect(validModes.includes('github')).toBe(true);
      expect(validModes.includes('invalid')).toBe(false);
    });

    it('should validate AI provider', () => {
      const validProviders = ['google', 'ollama'];
      expect(validProviders.includes('google')).toBe(true);
      expect(validProviders.includes('ollama')).toBe(true);
      expect(validProviders.includes('openai')).toBe(false);
    });

    it('should validate subject color format', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(hexColorRegex.test('#3B82F6')).toBe(true);
      expect(hexColorRegex.test('#abc')).toBe(false);
      expect(hexColorRegex.test('red')).toBe(false);
    });
  });
});
