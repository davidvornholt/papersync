import { expect, it } from 'bun:test';
import { Effect, Schema } from 'effect';
import { DueDate } from './contract';
import { getHomeworkId } from './identity';

it('rescans share an identity while another day or week remains distinct', async () => {
  const first = await Effect.runPromise(
    getHomeworkId('2026-W37', 'Monday', 'Math', 'Do exercise 1'),
  );
  const repeated = await Effect.runPromise(
    getHomeworkId('2026-W37', ' Monday ', 'Math', 'Do  exercise 1'),
  );
  const anotherDay = await Effect.runPromise(
    getHomeworkId('2026-W37', 'Tuesday', 'Math', 'Do exercise 1'),
  );
  const anotherWeek = await Effect.runPromise(
    getHomeworkId('2026-W38', 'Monday', 'Math', 'Do exercise 1'),
  );
  expect(repeated).toBe(first);
  expect(anotherDay).not.toBe(first);
  expect(anotherWeek).not.toBe(first);
});

it('due dates must be real calendar dates', () => {
  expect(Schema.is(DueDate)('2024-02-29')).toBe(true);
  expect(Schema.is(DueDate)('2025-02-29')).toBe(false);
  expect(Schema.is(DueDate)('2026-13-01')).toBe(false);
});
