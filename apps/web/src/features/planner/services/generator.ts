import { Effect, Schema } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
export class PlannerGenerationError extends Schema.TaggedError<PlannerGenerationError>()(
  'PlannerGenerationError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

export const downloadPlannerPdf = (
  blob: Blob,
  weekId: WeekId,
): Effect.Effect<void, never> =>
  Effect.sync(() => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planner-${weekId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
