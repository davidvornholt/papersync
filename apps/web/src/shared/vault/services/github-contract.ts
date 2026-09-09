import { Context, type Effect } from 'effect';
import type { GitHubAPIError } from '@/shared/vault/errors/github-contract';

export type GitHubFile = { readonly content: string; readonly sha: string };
export type GitHubLocation = {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly path: string;
};
export type GitHubFileChange = GitHubLocation & {
  readonly content: string;
  readonly message: string;
  readonly sha?: string;
};
export type GitHubService = {
  readonly getFile: (
    location: GitHubLocation,
  ) => Effect.Effect<GitHubFile | null, GitHubAPIError>;
  readonly setFile: (
    change: GitHubFileChange,
  ) => Effect.Effect<void, GitHubAPIError>;
};
// biome-ignore lint/security/noSecrets: Effect service identity, not a credential.
export const GitHubService = Context.GenericTag<GitHubService>('GitHubService');
