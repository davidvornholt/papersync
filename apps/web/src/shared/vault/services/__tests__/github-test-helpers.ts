import { Effect } from 'effect';
import type { GitHubService } from '../github';

export const createMockGitHubService = (
  overrides?: Partial<GitHubService>,
): GitHubService => {
  const defaultMock: GitHubService = {
    initiateDeviceFlow: () =>
      Effect.succeed({
        deviceCode: 'mock-device-code',
        userCode: 'MOCK-1234',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
      }),
    pollForToken: () =>
      Effect.succeed({
        accessToken: 'mock-access-token',
        tokenType: 'bearer',
        scope: 'repo',
      }),
    getFileContent: () => Effect.succeed('mock file content'),
    createOrUpdateFile: () => Effect.succeed(undefined),
    listRepositories: () =>
      Effect.succeed([
        {
          name: 'obsidian-vault',
          owner: 'user',
          fullName: 'user/obsidian-vault',
        },
      ]),
  };

  return { ...defaultMock, ...overrides };
};
