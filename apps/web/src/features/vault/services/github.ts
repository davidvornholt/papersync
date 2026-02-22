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
      try: () =>
        fetch(GITHUB_DEVICE_CODE_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
        })
          .then((response) =>
            response.ok
              ? (response.json() as Promise<Record<string, unknown>>)
              : response
                  .text()
                  .then((text) =>
                    Promise.reject(
                      new Error(`HTTP ${response.status}: ${text}`),
                    ),
                  ),
          )
          .then((data) => ({
            deviceCode: String(data.device_code),
            userCode: String(data.user_code),
            verificationUri: String(data.verification_uri),
            expiresIn: Number(data.expires_in),
            interval: Number(data.interval),
          })),
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
      try: () => {
        const octokit = new Octokit({ auth: token });
        return octokit.rest.repos
          .getContent({
            owner,
            repo,
            path,
            ref,
          })
          .then((response) => {
            const data = response.data;
            if ('content' in data && typeof data.content === 'string') {
              return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return null;
          })
          .catch((error: unknown) => {
            if (
              error instanceof Error &&
              'status' in error &&
              error.status === 404
            ) {
              return null;
            }
            return Promise.reject(error);
          });
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
      try: () => {
        const octokit = new Octokit({ auth: token });
        return octokit.rest.repos
          .createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
            sha,
          })
          .then(() => undefined);
      },
      catch: (error) =>
        new GitHubAPIError({
          message: `Failed to update file: ${path}`,
          cause: error,
        }),
    }),

  listRepositories: (token: string) =>
    Effect.tryPromise({
      try: () => {
        const octokit = new Octokit({ auth: token });
        return octokit.rest.repos
          .listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
          })
          .then((response) =>
            response.data.map((repo) => ({
              name: repo.name,
              owner: repo.owner.login,
              fullName: repo.full_name,
            })),
          );
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
