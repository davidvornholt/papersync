"use client";

import { Effect } from "effect";
import { useCallback, useState } from "react";
import type { Subject, WeekId } from "@/app/shared/types";
import {
  downloadPlannerPdf,
  generatePlannerPdf,
  getWeekDateRange,
  getWeekId,
  type PlannerGenerationError,
} from "../services/generator";
import type { QREncodeError } from "../services/qr";

// ============================================================================
// Types
// ============================================================================

export type PlannerState =
  | { readonly status: "idle" }
  | { readonly status: "generating" }
  | { readonly status: "generated"; readonly blob: Blob }
  | { readonly status: "error"; readonly error: string };

export type UsePlannerReturn = {
  readonly state: PlannerState;
  readonly weekId: WeekId;
  readonly dateRange: { start: Date; end: Date };
  readonly generate: (
    subjects: readonly Subject[],
    vaultPath: string,
  ) => Promise<void>;
  readonly download: () => void;
  readonly reset: () => void;
};

// ============================================================================
// Hook
// ============================================================================

export const usePlanner = (initialWeekId?: WeekId): UsePlannerReturn => {
  const weekId = initialWeekId ?? getWeekId();
  const dateRange = getWeekDateRange(weekId);

  const [state, setState] = useState<PlannerState>({ status: "idle" });

  const generate = useCallback(
    async (subjects: readonly Subject[], vaultPath: string): Promise<void> => {
      setState({ status: "generating" });

      const program = generatePlannerPdf({
        weekId,
        subjects,
        vaultPath,
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.map((blob) => ({ success: true as const, blob })),
          Effect.catchAll((error: PlannerGenerationError | QREncodeError) =>
            Effect.succeed({ success: false as const, error: error.message }),
          ),
        ),
      );

      if (result.success) {
        setState({ status: "generated", blob: result.blob });
      } else {
        setState({ status: "error", error: result.error });
      }
    },
    [weekId],
  );

  const download = useCallback((): void => {
    if (state.status !== "generated") return;

    Effect.runSync(downloadPlannerPdf(state.blob, weekId));
  }, [state, weekId]);

  const reset = useCallback((): void => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    weekId,
    dateRange,
    generate,
    download,
    reset,
  };
};
