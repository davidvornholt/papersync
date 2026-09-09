import { Data } from 'effect';
export class HomeworkError extends Data.TaggedError('HomeworkError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
