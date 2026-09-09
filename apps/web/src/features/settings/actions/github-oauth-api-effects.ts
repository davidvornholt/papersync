import { Effect, Schema } from 'effect';
import { GitHubAPIError } from '@/features/settings/errors/github-oauth-types';
import { fetchJson } from '@/shared/http/json';

const userSchema = Schema.Struct({
  login: Schema.String,
  name: Schema.NullOr(Schema.String),
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  avatar_url: Schema.String,
});
const repositorySchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  full_name: Schema.String,
  owner: Schema.Struct({ login: Schema.String }),
  private: Schema.Boolean,
  description: Schema.NullOr(Schema.String),
});
const getHeaders = (accessToken: string) => ({
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${accessToken}`,
  'X-GitHub-Api-Version': '2022-11-28',
});
export const getGitHubUserEffect = (accessToken: string) =>
  fetchJson('https://api.github.com/user', {
    headers: getHeaders(accessToken),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknown(userSchema)),
    Effect.map((data) => ({
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
    })),
    Effect.mapError(
      (cause) =>
        new GitHubAPIError({
          message:
            'Could not fetch your GitHub profile. Check the connection and try again.',
          cause,
        }),
    ),
  );
export const listRepositoriesEffect = (accessToken: string) =>
  fetchJson('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: getHeaders(accessToken),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknown(Schema.Array(repositorySchema))),
    Effect.map((data) =>
      data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        description: repo.description,
      })),
    ),
    Effect.mapError(
      (cause) =>
        new GitHubAPIError({
          message:
            'Could not list GitHub repositories. Check the connection and try again.',
          cause,
        }),
    ),
  );
