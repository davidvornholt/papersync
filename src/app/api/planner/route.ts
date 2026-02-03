import { pdf } from "@react-pdf/renderer";
import { Data, Effect } from "effect";
import { NextResponse } from "next/server";
import { PlannerDocument } from "@/app/features/planner/components/planner-document";
import {
  getWeekDateRange,
  getWeekId,
} from "@/app/features/planner/services/generator";
import { encodeQRPayload } from "@/app/features/planner/services/qr";
import type { Subject, WeekId } from "@/app/shared/types";

// ============================================================================
// Error Types
// ============================================================================

class RequestValidationError extends Data.TaggedError(
  "RequestValidationError",
)<{
  readonly message: string;
  readonly status: number;
}> {}

class PdfGenerationError extends Data.TaggedError("PdfGenerationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Types
// ============================================================================

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

type TimetableDay = {
  readonly day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  readonly slots: readonly TimetableSlot[];
};

type GeneratePdfRequest = {
  readonly weekId?: WeekId;
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
};

// ============================================================================
// Effect-Based Implementation
// ============================================================================

const parseRequestBody = (
  request: Request,
): Effect.Effect<GeneratePdfRequest, RequestValidationError> =>
  Effect.tryPromise({
    try: async () => (await request.json()) as GeneratePdfRequest,
    catch: (error) =>
      new RequestValidationError({
        message: error instanceof Error ? error.message : "Invalid JSON body",
        status: 400,
      }),
  });

const validateRequest = (
  body: GeneratePdfRequest,
): Effect.Effect<GeneratePdfRequest, RequestValidationError> =>
  Effect.gen(function* () {
    if (!body.subjects || !Array.isArray(body.subjects)) {
      return yield* Effect.fail(
        new RequestValidationError({
          message: "Subjects must be an array",
          status: 400,
        }),
      );
    }

    if (!body.timetable || !Array.isArray(body.timetable)) {
      return yield* Effect.fail(
        new RequestValidationError({
          message: "Timetable must be an array",
          status: 400,
        }),
      );
    }

    return body;
  });

const generatePdfEffect = (
  request: Request,
): Effect.Effect<ArrayBuffer, RequestValidationError | PdfGenerationError> =>
  Effect.gen(function* () {
    const body = yield* parseRequestBody(request);
    const validatedBody = yield* validateRequest(body);

    const weekId = validatedBody.weekId ?? getWeekId();
    const dateRange = getWeekDateRange(weekId);

    // Generate QR code
    const qrDataUrl = yield* encodeQRPayload(weekId).pipe(
      Effect.mapError(
        (error) =>
          new PdfGenerationError({
            message: `QR generation failed: ${error.message}`,
            cause: error,
          }),
      ),
    );

    // Generate PDF document
    const document = PlannerDocument({
      weekId,
      dateRange,
      subjects: validatedBody.subjects as Subject[],
      timetable: validatedBody.timetable as TimetableDay[],
      qrDataUrl,
    });

    // Generate PDF blob
    const pdfBlob = yield* Effect.tryPromise({
      try: async () => pdf(document as Parameters<typeof pdf>[0]).toBlob(),
      catch: (error) =>
        new PdfGenerationError({
          message:
            error instanceof Error ? error.message : "Failed to generate PDF",
          cause: error,
        }),
    });

    // Convert Blob to ArrayBuffer
    const arrayBuffer = yield* Effect.tryPromise({
      try: async () => pdfBlob.arrayBuffer(),
      catch: (error) =>
        new PdfGenerationError({
          message: "Failed to convert PDF to buffer",
          cause: error,
        }),
    });

    return arrayBuffer;
  });

// ============================================================================
// API Route Handler
// ============================================================================

export const POST = async (request: Request): Promise<Response> => {
  const result = await Effect.runPromise(
    generatePdfEffect(request).pipe(
      Effect.map((arrayBuffer) => ({
        success: true as const,
        arrayBuffer,
        weekId: getWeekId(), // Re-calculate for header
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          success: false as const,
          error: error.message,
          status: error._tag === "RequestValidationError" ? error.status : 500,
        }),
      ),
    ),
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return new Response(result.arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="planner-${result.weekId}.pdf"`,
      "Content-Length": result.arrayBuffer.byteLength.toString(),
    },
  });
};
