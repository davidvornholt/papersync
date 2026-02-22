import { pdf } from '@react-pdf/renderer';
import { Data, Effect } from 'effect';
import type { Subject, WeekId } from '@/shared/types';
import { PlannerDocument } from '../components/planner-document';
import { getWeekDateRange, getWeekId } from './generator';
import { encodeQRPayload } from './qr';

export class RequestValidationError extends Data.TaggedError(
  'RequestValidationError',
)<{
  readonly message: string;
  readonly status: number;
}> {}

export class PdfGenerationError extends Data.TaggedError('PdfGenerationError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

type TimetableDay = {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  readonly slots: readonly TimetableSlot[];
};

export type GeneratePdfRequest = {
  readonly weekId?: WeekId;
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
};

export const parseGeneratePdfRequestBody = (
  request: Request,
): Effect.Effect<GeneratePdfRequest, RequestValidationError> =>
  Effect.tryPromise({
    try: () => request.json() as Promise<GeneratePdfRequest>,
    catch: (error) =>
      new RequestValidationError({
        message: error instanceof Error ? error.message : 'Invalid JSON body',
        status: 400,
      }),
  });

export const validateGeneratePdfRequest = (
  body: GeneratePdfRequest,
): Effect.Effect<GeneratePdfRequest, RequestValidationError> =>
  Effect.gen(function* () {
    yield* Effect.if(Array.isArray(body.subjects), {
      onTrue: () => Effect.void,
      onFalse: () =>
        Effect.fail(
          new RequestValidationError({
            message: 'Subjects must be an array',
            status: 400,
          }),
        ),
    });

    yield* Effect.if(Array.isArray(body.timetable), {
      onTrue: () => Effect.void,
      onFalse: () =>
        Effect.fail(
          new RequestValidationError({
            message: 'Timetable must be an array',
            status: 400,
          }),
        ),
    });

    return body;
  });

export const generatePlannerPdfBufferEffect = (
  request: Request,
): Effect.Effect<
  { readonly arrayBuffer: ArrayBuffer; readonly weekId: WeekId },
  RequestValidationError | PdfGenerationError
> =>
  Effect.gen(function* () {
    const body = yield* parseGeneratePdfRequestBody(request);
    const validatedBody = yield* validateGeneratePdfRequest(body);

    const weekId = validatedBody.weekId ?? getWeekId();
    const dateRange = getWeekDateRange(weekId);

    const qrDataUrl = yield* encodeQRPayload(weekId).pipe(
      Effect.mapError(
        (error) =>
          new PdfGenerationError({
            message: `QR generation failed: ${error.message}`,
            cause: error,
          }),
      ),
    );

    const document = PlannerDocument({
      weekId,
      dateRange,
      subjects: validatedBody.subjects as Subject[],
      timetable: validatedBody.timetable as TimetableDay[],
      qrDataUrl,
    });

    const pdfBlob = yield* Effect.tryPromise({
      try: () => pdf(document as Parameters<typeof pdf>[0]).toBlob(),
      catch: (error) =>
        new PdfGenerationError({
          message:
            error instanceof Error ? error.message : 'Failed to generate PDF',
          cause: error,
        }),
    });

    const arrayBuffer = yield* Effect.tryPromise({
      try: () => pdfBlob.arrayBuffer(),
      catch: (error) =>
        new PdfGenerationError({
          message: 'Failed to convert PDF to buffer',
          cause: error,
        }),
    });

    return { arrayBuffer, weekId };
  });
