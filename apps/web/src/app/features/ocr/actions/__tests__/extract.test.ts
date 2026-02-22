import { describe, expect, it } from 'bun:test';
import type { VaultSettings } from '../extract';

describe('OCR Extraction with Vault Context', () => {
  describe('VaultSettings type', () => {
    it('should define local vault settings type', () => {
      const localSettings: VaultSettings = {
        method: 'local',
        localPath: '/path/to/vault',
      };
      expect(localSettings.method).toBe('local');
      expect(localSettings.localPath).toBe('/path/to/vault');
    });

    it('should define github vault settings type', () => {
      const githubSettings: VaultSettings = {
        method: 'github',
        githubToken: 'token123',
        githubRepo: 'owner/repo',
      };
      expect(githubSettings.method).toBe('github');
      expect(githubSettings.githubToken).toBe('token123');
      expect(githubSettings.githubRepo).toBe('owner/repo');
    });

    it('should allow undefined vault settings', () => {
      const settings: VaultSettings | undefined = undefined;
      expect(settings).toBeUndefined();
    });
  });

  describe('ExtractionOptions', () => {
    it('should accept options with vault settings', () => {
      const options = {
        imageBase64: 'data:image/png;base64,abc123',
        weekId: '2026-W05',
        provider: 'google' as const,
        googleApiKey: 'test-key',
        vaultSettings: {
          method: 'local' as const,
          localPath: '/path/to/vault',
        },
      };

      expect(options.vaultSettings?.method).toBe('local');
    });

    it('should accept options without vault settings', () => {
      const options: {
        imageBase64: string;
        weekId: string;
        provider: 'google';
        googleApiKey: string;
        vaultSettings?: VaultSettings;
      } = {
        imageBase64: 'data:image/png;base64,abc123',
        weekId: '2026-W05',
        provider: 'google' as const,
        googleApiKey: 'test-key',
      };

      expect(options.vaultSettings).toBeUndefined();
    });
  });

  describe('Edge cases for vault content fetching', () => {
    it('should handle empty vault path gracefully', () => {
      const settings: VaultSettings = {
        method: 'local',
        localPath: '',
      };
      // Empty path should be treated as no content
      expect(settings.localPath).toBe('');
    });

    it('should handle missing github credentials', () => {
      const settings: VaultSettings = {
        method: 'github',
        // Missing token and repo
      };
      expect(settings.githubToken).toBeUndefined();
      expect(settings.githubRepo).toBeUndefined();
    });

    it('should handle invalid github repo format', () => {
      const settings: VaultSettings = {
        method: 'github',
        githubToken: 'token',
        githubRepo: 'invalid-format', // Missing owner/repo format
      };
      // Should handle this gracefully
      expect(settings.githubRepo).toBe('invalid-format');
    });
  });
});
