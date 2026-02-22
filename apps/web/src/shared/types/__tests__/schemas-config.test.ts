import { describe, expect, it } from 'bun:test';
import { Schema } from '@effect/schema';
import {
  AIProvider,
  AppConfig,
  VaultAccessMethod,
} from '@/shared/types/schemas';

describe('AppConfig Schema', () => {
  it('should accept valid app config', () => {
    const config = Schema.decodeUnknownSync(AppConfig)({
      vaultPath: '/path/to/vault',
      vaultAccessMethod: 'local',
      aiProvider: 'google',
      subjectsPerDay: 4,
    });

    expect(config.vaultPath).toBe('/path/to/vault');
    expect(config.vaultAccessMethod).toBe('local');
    expect(config.aiProvider).toBe('google');
    expect(config.subjectsPerDay).toBe(4);
  });

  it('should accept github vault method with tokens', () => {
    const config = Schema.decodeUnknownSync(AppConfig)({
      vaultPath: '/vault',
      vaultAccessMethod: 'github',
      aiProvider: 'ollama',
      githubToken: 'ghp_xxx',
      githubRepo: 'user/vault',
      ollamaEndpoint: 'http://localhost:11434',
      subjectsPerDay: 5,
    });

    expect(config.vaultAccessMethod).toBe('github');
    expect(config.githubToken).toBe('ghp_xxx');
  });

  it('should validate subjectsPerDay range (3-6)', () => {
    expect(() =>
      Schema.decodeUnknownSync(AppConfig)({
        vaultPath: '/vault',
        vaultAccessMethod: 'local',
        aiProvider: 'google',
        subjectsPerDay: 2,
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(AppConfig)({
        vaultPath: '/vault',
        vaultAccessMethod: 'local',
        aiProvider: 'google',
        subjectsPerDay: 7,
      }),
    ).toThrow();
  });
});

describe('AIProvider Schema', () => {
  it('should accept valid providers', () => {
    expect(Schema.decodeUnknownSync(AIProvider)('google')).toBe('google');
    expect(Schema.decodeUnknownSync(AIProvider)('ollama')).toBe('ollama');
  });

  it('should reject invalid providers', () => {
    expect(() => Schema.decodeUnknownSync(AIProvider)('openai')).toThrow();
  });
});

describe('VaultAccessMethod Schema', () => {
  it('should accept valid access methods', () => {
    expect(Schema.decodeUnknownSync(VaultAccessMethod)('local')).toBe('local');
    expect(Schema.decodeUnknownSync(VaultAccessMethod)('github')).toBe(
      'github',
    );
  });

  it('should reject invalid access methods', () => {
    expect(() =>
      Schema.decodeUnknownSync(VaultAccessMethod)('cloud'),
    ).toThrow();
  });
});
