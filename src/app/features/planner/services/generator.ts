import { Data, Effect } from 'effect';
import type { WeekId } from '@/app/shared/types';

// ============================================================================
// Error Types
// ============================================================================

export class PlannerGenerationError extends Data.TaggedError(
  'PlannerGenerationError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Week Calculation Utilities
// ============================================================================

export const getWeekId = (date: Date = new Date()): WeekId => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}` as WeekId;
};

export const getWeekStartDate = (weekId: WeekId): Date => {
  const [year, week] = weekId.split('-W').map(Number);
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const dayOfWeek = jan1.getDay();
  const mondayOffset = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;

  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + mondayOffset + daysOffset);

  return weekStart;
};

export const getWeekEndDate = (weekId: WeekId): Date => {
  const start = getWeekStartDate(weekId);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
};

export const getWeekDateRange = (
  weekId: WeekId,
): { start: Date; end: Date } => ({
  start: getWeekStartDate(weekId),
  end: getWeekEndDate(weekId),
});

// ============================================================================
// Download Helper
// ============================================================================

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
