import { Effect, Layer, Schema } from 'effect';
import { fetchJson } from '@/shared/http/json';
import { GitHubAPIError } from '@/shared/vault/errors/github-contract';
import { type GitHubLocation, GitHubService } from './github-contract';

const notFoundStatus = 404;
const fileSchema = Schema.Struct({
  content: Schema.String,
  sha: Schema.NonEmptyString,
});
const getUrl = ({ owner, repo, path }: GitHubLocation) =>
  `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
const getHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'content-type': 'application/json',
});

export const githubService: GitHubService = {
  getFile: (location) =>
    fetchJson(getUrl(location), { headers: getHeaders(location.token) }).pipe(
      Effect.flatMap(Schema.decodeUnknown(fileSchema)),
      Effect.map((file) => ({
        content: Buffer.from(file.content, 'base64').toString('utf-8'),
        sha: file.sha,
      })),
      Effect.catchTag('HttpError', (error) =>
        error.status === notFoundStatus
          ? Effect.succeed(null)
          : Effect.fail(error),
      ),
      Effect.mapError(
        (cause) =>
          new GitHubAPIError({
            message: `Could not fetch ${location.path}. Check repository access and try again.`,
            cause,
          }),
      ),
    ),
  setFile: (change) =>
    fetchJson(getUrl(change), {
      method: 'PUT',
      headers: getHeaders(change.token),
      body: JSON.stringify({
        message: change.message,
        content: Buffer.from(change.content).toString('base64'),
        sha: change.sha,
      }),
    }).pipe(
      Effect.asVoid,
      Effect.mapError(
        (cause) =>
          new GitHubAPIError({
            message: `Could not save ${change.path}. Reload if another device changed the file.`,
            cause,
          }),
      ),
    ),
};
export const GitHubServiceLive = Layer.succeed(GitHubService, githubService);
