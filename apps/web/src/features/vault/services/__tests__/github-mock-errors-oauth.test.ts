import { describe, expect, it } from 'bun:test';
import { Effect, Layer } from 'effect';
import { GitHubAPIError, GitHubAuthError, GitHubService } from '../github';
import { createMockGitHubService } from './github-test-helpers';

describe('GitHubService Mock Implementation', () => {
  describe('error handling', () => {
    it('should handle auth errors', async () => {
      const mockService = createMockGitHubService({
        initiateDeviceFlow: () =>
          Effect.fail(new GitHubAuthError({ message: 'Invalid client ID' })),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.initiateDeviceFlow('invalid-client-id');
      }).pipe(Effect.provide(layer), Effect.flip);

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe('GitHubAuthError');
      expect((error as GitHubAuthError).message).toBe('Invalid client ID');
    });

    it('should handle API errors', async () => {
      const mockService = createMockGitHubService({
        listRepositories: () =>
          Effect.fail(
            new GitHubAPIError({ message: 'Rate limit exceeded', status: 429 }),
          ),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.listRepositories('mock-token');
      }).pipe(Effect.provide(layer), Effect.flip);

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe('GitHubAPIError');
      expect((error as GitHubAPIError).message).toBe('Rate limit exceeded');
      expect((error as GitHubAPIError).status).toBe(429);
    });
  });

  describe('OAuth flow integration', () => {
    it('should complete full OAuth flow', async () => {
      let tokenPolled = false;
      const mockService = createMockGitHubService({
        initiateDeviceFlow: () =>
          Effect.succeed({
            deviceCode: 'flow-device-code',
            userCode: 'FLOW-5678',
            verificationUri: 'https://github.com/login/device',
            expiresIn: 900,
            interval: 5,
          }),
        pollForToken: () => {
          tokenPolled = true;
          return Effect.succeed({
            accessToken: 'flow-access-token',
            tokenType: 'bearer',
            scope: 'repo',
          });
        },
        listRepositories: () =>
          Effect.succeed([
            {
              name: 'my-vault',
              owner: 'testuser',
              fullName: 'testuser/my-vault',
            },
          ]),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        const deviceCode = yield* service.initiateDeviceFlow('test-client');
        const token = yield* service.pollForToken(
          'test-client',
          deviceCode.deviceCode,
          deviceCode.interval,
        );
        const repos = yield* service.listRepositories(token.accessToken);

        return { deviceCode, token, repos };
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result.deviceCode.userCode).toBe('FLOW-5678');
      expect(tokenPolled).toBe(true);
      expect(result.token.accessToken).toBe('flow-access-token');
      expect(result.repos[0].fullName).toBe('testuser/my-vault');
    });
  });
});
