import { Data } from 'effect';

export class VaultError extends Data.TaggedError('VaultError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class VaultNotFoundError extends Data.TaggedError('VaultNotFoundError')<{
  readonly path: string;
}> {}

export class VaultFileNotFoundError extends Data.TaggedError(
  'VaultFileNotFoundError',
)<{
  readonly filePath: string;
}> {}
