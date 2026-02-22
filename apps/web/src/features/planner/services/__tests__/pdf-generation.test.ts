import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { WeekId } from '@/shared/types';
import {
  type GeneratePdfRequest,
  generatePlannerPdfBufferEffect,
  parseGeneratePdfRequestBody,
  RequestValidationError,
  validateGeneratePdfRequest,
} from '../pdf-generation';

const createRequest = (body: string): Request =>
  new Request('http://localhost/api/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('planner PDF generation request handling', () => {
  it('parses valid request JSON', async () => {
    const request = createRequest(
      JSON.stringify({
        weekId: '2026-W05',
        subjects: [{ id: 'math', name: 'Math' }],
        timetable: [
          { day: 'monday', slots: [{ id: 's1', subjectId: 'math' }] },
        ],
      }),
    );

    const result = await Effect.runPromise(
      parseGeneratePdfRequestBody(request),
    );
    expect(String(result.weekId)).toBe('2026-W05');
    expect(result.subjects).toHaveLength(1);
  });

  it('fails on invalid request JSON', async () => {
    const request = createRequest('not-json');

    const error = await Effect.runPromise(
      parseGeneratePdfRequestBody(request).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(RequestValidationError);
  });

  it('validates a complete planner request', async () => {
    const requestBody: GeneratePdfRequest = {
      weekId: '2026-W05' as WeekId,
      subjects: [{ id: 'math', name: 'Math' }],
      timetable: [{ day: 'monday', slots: [{ id: 's1', subjectId: 'math' }] }],
    };

    const result = await Effect.runPromise(
      validateGeneratePdfRequest(requestBody),
    );
    expect(result).toEqual(requestBody);
  });

  it('fails validation when subjects is missing', async () => {
    const requestBody = {
      timetable: [{ day: 'monday', slots: [] }],
    } as unknown as GeneratePdfRequest;

    const error = await Effect.runPromise(
      validateGeneratePdfRequest(requestBody).pipe(Effect.flip),
    );
    expect(error).toMatchObject({
      _tag: 'RequestValidationError',
      message: 'Subjects must be an array',
      status: 400,
    });
  });

  it('fails validation when timetable is missing', async () => {
    const requestBody = {
      subjects: [{ id: 'math', name: 'Math' }],
    } as unknown as GeneratePdfRequest;

    const error = await Effect.runPromise(
      validateGeneratePdfRequest(requestBody).pipe(Effect.flip),
    );
    expect(error).toMatchObject({
      _tag: 'RequestValidationError',
      message: 'Timetable must be an array',
      status: 400,
    });
  });

  it('generates PDF bytes for a valid request', async () => {
    const request = createRequest(
      JSON.stringify({
        weekId: '2026-W05',
        subjects: [{ id: 'math', name: 'Math' }],
        timetable: [
          { day: 'monday', slots: [{ id: 's1', subjectId: 'math' }] },
        ],
      }),
    );

    const result = await Effect.runPromise(
      generatePlannerPdfBufferEffect(request),
    );
    expect(String(result.weekId)).toBe('2026-W05');
    expect(result.arrayBuffer.byteLength).toBeGreaterThan(0);
  });
});
