import { describe, expect, it, mock } from 'bun:test';
import { Effect, Layer } from 'effect';
import { GitHubService } from '../github';
import { createMockGitHubService } from './github-test-helpers';

describe('GitHubService Mock Implementation', () => {
  describe('device flow', () => {
    it('should return device code response', async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.initiateDeviceFlow('test-client-id');
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result.deviceCode).toBe('mock-device-code');
      expect(result.userCode).toBe('MOCK-1234');
      expect(result.verificationUri).toBe('https://github.com/login/device');
    });

    it('should poll for token and return access token', async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.pollForToken(
          'test-client-id',
          'mock-device-code',
          5,
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.tokenType).toBe('bearer');
      expect(result.scope).toBe('repo');
    });
  });

  describe('repository operations', () => {
    it('should list repositories', async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.listRepositories('mock-token');
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('user/obsidian-vault');
    });

    it('should get file content', async () => {
      const mockService = createMockGitHubService({
        getFileContent: () => Effect.succeed('# Weekly Note\n\n## Monday'),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.getFileContent(
          'mock-token',
          'user',
          'obsidian-vault',
          'Weekly/2026-W05.md',
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toBe('# Weekly Note\n\n## Monday');
    });

    it('should return null for non-existent file', async () => {
      const mockService = createMockGitHubService({
        getFileContent: () => Effect.succeed(null),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.getFileContent(
          'mock-token',
          'user',
          'obsidian-vault',
          'non-existent.md',
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toBeNull();
    });

    it('should create or update file', async () => {
      const createOrUpdateFileSpy = mock(() => Effect.succeed(undefined));
      const mockService = createMockGitHubService({
        createOrUpdateFile: createOrUpdateFileSpy,
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        yield* service.createOrUpdateFile(
          'mock-token',
          'user',
          'obsidian-vault',
          'Weekly/2026-W05.md',
          '# Weekly Note\n\n## Monday',
          'Update weekly note',
        );
      }).pipe(Effect.provide(layer));

      await Effect.runPromise(program);
      expect(createOrUpdateFileSpy).toHaveBeenCalled();
    });
  });
});
