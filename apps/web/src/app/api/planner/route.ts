import { Effect } from 'effect';
import { NextResponse } from 'next/server';
import { generatePlannerPdfBufferEffect } from '@/features/planner/services/pdf-generation';

export const POST = async (request: Request): Promise<Response> => {
  return Effect.runPromise(
    generatePlannerPdfBufferEffect(request).pipe(
      Effect.match({
        onFailure: (error) =>
          NextResponse.json(
            { error: error.message },
            {
              status:
                error._tag === 'RequestValidationError' ? error.status : 500,
            },
          ),
        onSuccess: (payload) =>
          new Response(payload.arrayBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="planner-${payload.weekId}.pdf"`,
              'Content-Length': payload.arrayBuffer.byteLength.toString(),
            },
          }),
      }),
    ),
  );
};
