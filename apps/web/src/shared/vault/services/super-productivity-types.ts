import { Data } from 'effect';

export const DEFAULT_SUPER_PRODUCTIVITY_ENDPOINT = 'http://127.0.0.1:3876';

export class SuperProductivityApiError extends Data.TaggedError(
  'SuperProductivityApiError',
)<{
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

export type SuperProductivityTask = {
  readonly id: string;
  readonly title: string;
  readonly notes?: string;
  readonly isDone?: boolean;
  readonly projectId?: string | null;
  readonly tagIds?: readonly string[];
  readonly dueDay?: string | null;
};

export type SuperProductivityTaskInput = {
  readonly title: string;
  readonly notes?: string;
  readonly isDone?: boolean;
  readonly projectId?: string;
  readonly tagIds?: readonly string[];
  readonly dueDay?: string;
};
