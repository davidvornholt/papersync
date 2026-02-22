import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import {
  type DeviceCodeResponse,
  GitHubAPIError,
  GitHubAuthError,
  GitHubService,
  GitHubServiceLive,
  type OAuthTokenResponse,
} from '../github';

describe('GitHubService Interface', () => {
  describe('initiateDeviceFlow', () => {
    it('should have correct interface signature', () => {
      const mockService: GitHubService = {
        initiateDeviceFlow: (_clientId: string) =>
          Effect.succeed({
            deviceCode: 'test-device-code',
            userCode: 'TEST-1234',
            verificationUri: 'https://github.com/login/device',
            expiresIn: 900,
            interval: 5,
          }),
        pollForToken: () =>
          Effect.succeed({
            accessToken: 'test-token',
            tokenType: 'bearer',
            scope: 'repo',
          }),
        getFileContent: () => Effect.succeed('file content'),
        createOrUpdateFile: () => Effect.succeed(undefined),
        listRepositories: () => Effect.succeed([]),
      };

      expect(mockService.initiateDeviceFlow).toBeDefined();
    });
  });

  describe('DeviceCodeResponse type', () => {
    it('should have all required fields', () => {
      const response: DeviceCodeResponse = {
        deviceCode: 'abc123',
        userCode: 'USER-CODE',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
      };

      expect(response.deviceCode).toBe('abc123');
      expect(response.userCode).toBe('USER-CODE');
      expect(response.verificationUri).toBe('https://github.com/login/device');
      expect(response.expiresIn).toBe(900);
      expect(response.interval).toBe(5);
    });
  });

  describe('OAuthTokenResponse type', () => {
    it('should have all required fields', () => {
      const response: OAuthTokenResponse = {
        accessToken: 'gho_abcdef123456',
        tokenType: 'bearer',
        scope: 'repo',
      };

      expect(response.accessToken).toBe('gho_abcdef123456');
      expect(response.tokenType).toBe('bearer');
      expect(response.scope).toBe('repo');
    });
  });

  describe('GitHubAuthError', () => {
    it('should create error with message', () => {
      const error = new GitHubAuthError({ message: 'Auth failed' });
      expect(error._tag).toBe('GitHubAuthError');
      expect(error.message).toBe('Auth failed');
    });

    it('should create error with cause', () => {
      const cause = new Error('Network error');
      const error = new GitHubAuthError({
        message: 'Auth failed',
        cause,
      });
      expect(error.cause).toBe(cause);
    });
  });

  describe('GitHubAPIError', () => {
    it('should create error with message', () => {
      const error = new GitHubAPIError({ message: 'API request failed' });
      expect(error._tag).toBe('GitHubAPIError');
      expect(error.message).toBe('API request failed');
    });

    it('should create error with status code', () => {
      const error = new GitHubAPIError({
        message: 'Not found',
        status: 404,
      });
      expect(error.status).toBe(404);
    });
  });

  describe('GitHubServiceLive layer', () => {
    it('should provide a valid GitHubService', async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return typeof service.initiateDeviceFlow === 'function';
      }).pipe(Effect.provide(GitHubServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it('should have all required methods', async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return {
          hasInitiateDeviceFlow:
            typeof service.initiateDeviceFlow === 'function',
          hasPollForToken: typeof service.pollForToken === 'function',
          hasGetFileContent: typeof service.getFileContent === 'function',
          hasCreateOrUpdateFile:
            typeof service.createOrUpdateFile === 'function',
          hasListRepositories: typeof service.listRepositories === 'function',
        };
      }).pipe(Effect.provide(GitHubServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.hasInitiateDeviceFlow).toBe(true);
      expect(result.hasPollForToken).toBe(true);
      expect(result.hasGetFileContent).toBe(true);
      expect(result.hasCreateOrUpdateFile).toBe(true);
      expect(result.hasListRepositories).toBe(true);
    });
  });
});
