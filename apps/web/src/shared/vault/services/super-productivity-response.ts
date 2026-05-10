import type { SuperProductivityTask } from './super-productivity-types';

export type SuperProductivitySuccessResponse = {
  readonly ok: true;
  readonly data: unknown;
};

export type SuperProductivityErrorResponse = {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
};

export type SuperProductivityResponse =
  | SuperProductivitySuccessResponse
  | SuperProductivityErrorResponse;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isSuperProductivityResponse = (
  value: unknown,
): value is SuperProductivityResponse => {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok === true) {
    return 'data' in value;
  }

  return (
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  );
};

export const isSuperProductivityTask = (
  value: unknown,
): value is SuperProductivityTask =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string';

export const isSuperProductivityTaskArray = (
  value: unknown,
): value is readonly SuperProductivityTask[] =>
  Array.isArray(value) && value.every(isSuperProductivityTask);
