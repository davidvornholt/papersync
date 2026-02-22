import { Effect } from 'effect';
import {
  GitHubAPIError,
  type GitHubRepository,
  type GitHubUser,
} from './github-oauth-types';

export const getGitHubUserEffect = (
  accessToken: string,
): Effect.Effect<GitHubUser, GitHubAPIError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        return Promise.reject({ status: response.status });
      }

      const data = await response.json();
      return { login: data.login, name: data.name, avatarUrl: data.avatar_url };
    },
    catch: (error) =>
      new GitHubAPIError({
        message:
          typeof error === 'object' && error !== null && 'status' in error
            ? `GitHub API returned ${error.status}`
            : error instanceof Error
              ? error.message
              : 'Failed to fetch GitHub user',
        status:
          typeof error === 'object' && error !== null && 'status' in error
            ? (error.status as number)
            : undefined,
        cause: error,
      }),
  });

export const listRepositoriesEffect = (
  accessToken: string,
): Effect.Effect<readonly GitHubRepository[], GitHubAPIError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=100',
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      if (!response.ok) {
        return Promise.reject({ status: response.status });
      }

      const data = await response.json();
      return data.map(
        (repo: {
          id: number;
          name: string;
          full_name: string;
          owner: { login: string };
          private: boolean;
          description: string | null;
        }) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          description: repo.description,
        }),
      );
    },
    catch: (error) =>
      new GitHubAPIError({
        message:
          typeof error === 'object' && error !== null && 'status' in error
            ? `GitHub API returned ${error.status}`
            : error instanceof Error
              ? error.message
              : 'Failed to list repositories',
        status:
          typeof error === 'object' && error !== null && 'status' in error
            ? (error.status as number)
            : undefined,
        cause: error,
      }),
  });
