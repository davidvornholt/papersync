import { Effect } from 'effect';
import { NextResponse } from 'next/server';
import { generatePlannerPdfBufferEffect } from '@/features/planner/services/pdf-generation';
import { requireSession } from '@/shared/auth/session';

const internalServerErrorStatus = 500;
export const POST = async (request: Request): Promise<Response> => {
  await requireSession();
  return Effect.runPromise(
    generatePlannerPdfBufferEffect(request).pipe(
      Effect.match({
        onFailure: (error) =>
          NextResponse.json(
            { error: error.message },
            {
              status:
                error._tag === 'RequestValidationError'
                  ? error.status
                  : internalServerErrorStatus,
            },
          ),
        onSuccess: (payload) =>
          new Response(payload.arrayBuffer, {
            headers: {
              'content-type': 'application/pdf',
              'content-disposition': `attachment; filename="planner-${payload.weekId}.pdf"`,
              'content-length': payload.arrayBuffer.byteLength.toString(),
            },
          }),
      }),
    ),
  );
};
