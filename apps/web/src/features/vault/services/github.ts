import { Effect, Layer } from 'effect';
import { Octokit } from 'octokit';
import type { GitHubService as GitHubServiceContract } from './github-contract';
import {
  GitHubAPIError,
  GitHubAuthError,
  GitHubService as GitHubServiceTag,
} from './github-contract';
import { createPollForToken } from './github-poll';

export {
  type DeviceCodeResponse,
  GitHubAPIError,
  GitHubAuthError,
  GitHubService,
  type OAuthTokenResponse,
} from './github-contract';

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

const createGitHubService = (): GitHubServiceContract => ({
  initiateDeviceFlow: (clientId: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(GITHUB_DEVICE_CODE_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
        });
        if (!response.ok) {
          return Promise.reject(
            new Error(`HTTP ${response.status}: ${await response.text()}`),
          );
        }
        const data = await response.json();
        return {
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          expiresIn: data.expires_in,
          interval: data.interval,
        };
      },
      catch: (error) =>
        new GitHubAuthError({
          message: 'Failed to initiate device flow',
          cause: error,
        }),
    }),

  pollForToken: createPollForToken(GITHUB_ACCESS_TOKEN_URL),

  getFileContent: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });
        try {
          const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
          });
          const data = response.data;
          if ('content' in data && typeof data.content === 'string') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
          }
          return null;
        } catch (error) {
          if (
            error instanceof Error &&
            'status' in error &&
            error.status === 404
          ) {
            return null;
          }
          return Promise.reject(error);
        }
      },
      catch: (error) =>
        new GitHubAPIError({
          message: `Failed to get file: ${path}`,
          cause: error,
        }),
    }),

  createOrUpdateFile: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          sha,
        });
      },
      catch: (error) =>
        new GitHubAPIError({
          message: `Failed to update file: ${path}`,
          cause: error,
        }),
    }),

  listRepositories: (token: string) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });
        const response = await octokit.rest.repos.listForAuthenticatedUser({
          sort: 'updated',
          per_page: 100,
        });
        return response.data.map((repo) => ({
          name: repo.name,
          owner: repo.owner.login,
          fullName: repo.full_name,
        }));
      },
      catch: (error) =>
        new GitHubAPIError({
          message: 'Failed to list repositories',
          cause: error,
        }),
    }),
});

export const GitHubServiceLive: Layer.Layer<
  GitHubServiceContract,
  never,
  never
> = Layer.succeed(GitHubServiceTag, createGitHubService());
