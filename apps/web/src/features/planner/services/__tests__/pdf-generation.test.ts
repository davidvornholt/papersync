import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { RequestValidationError } from '@/features/planner/errors/pdf-generation';
import { getWeekStartDate } from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';
import {
  formatCompactDateRange,
  formatDate,
  getDaysOfWeek,
  getSubjectsForDay,
} from '../../components/planner-document-helpers';
import {
  type GeneratePdfRequest,
  generatePlannerPdfBufferEffect,
  parseGeneratePdfRequestBody,
  validateGeneratePdfRequest,
} from '../pdf-generation';

const typicalSubjectCount = 6;
const busySubjectCount = 8;
const pdfPagePattern = /\/Type\s*\/Page\b/gu;

const createRequest = (body: string): Request =>
  new Request('http://localhost/api/planner', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('planner PDF generation request handling', () => {
  it('parses valid request JSON', async () => {
    const request = createRequest(
      JSON.stringify({
        weekId: '2026-W05',
        subjects: [{ id: 'math', name: 'Math' }],
        timetable: [{ day: 'monday', subjectIds: ['math'] }],
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
      timetable: [{ day: 'monday', subjectIds: ['math'] }],
    };

    const result = await Effect.runPromise(
      validateGeneratePdfRequest(requestBody),
    );
    expect(result).toEqual(requestBody);
  });

  it('fails validation when subjects is missing', async () => {
    const requestBody = {
      timetable: [{ day: 'monday', subjectIds: [] }],
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

  it.each([0, 1, typicalSubjectCount, busySubjectCount])(
    'keeps a week with %i subjects per day on two A4 pages',
    async (subjectCount) => {
      const subjects = Array.from({ length: subjectCount }, (_, index) => ({
        id: `subject-${index}`,
        name: index === 0 ? 'Politics and social sciences' : `Subject ${index}`,
      }));
      const timetable = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
      ].map((day) => ({
        day,
        subjectIds: subjects.map((subject) => subject.id),
      }));
      const result = await Effect.runPromise(
        generatePlannerPdfBufferEffect(
          createRequest(
            JSON.stringify({
              weekId: '2026-W05',
              subjects,
              timetable,
            }),
          ),
        ),
      );
      expect(String(result.weekId)).toBe('2026-W05');
      // Page dictionaries remain uncompressed even when text streams are compressed.
      const document = Buffer.from(result.arrayBuffer).toString('latin1');
      expect(document.match(pdfPagePattern)).toHaveLength(2);
    },
  );
});

it('prints full dates for cropped days, including weeks spanning New Year', () => {
  const start = getWeekStartDate('2026-W01' as WeekId);
  expect(formatCompactDateRange(start)).toBe('2025-12-29 – 2026-01-02');
  expect(getDaysOfWeek(start).map((day) => formatDate(day.date))).toEqual([
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
  ]);
});

it('keeps the day order of subjects and skips ids without a subject', () => {
  const math = { id: 'math', name: 'Mathematics' };
  const arts = { id: 'arts', name: 'Arts' };
  expect(
    getSubjectsForDay(
      'monday',
      [{ day: 'monday', subjectIds: ['arts', 'deleted', 'math'] }],
      [math, arts],
    ),
  ).toEqual([arts, math]);
});
