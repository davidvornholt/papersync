"use client";

import { Effect } from "effect";
import { useCallback, useState } from "react";
import type { Subject, WeekId } from "@/app/shared/types";
import {
  downloadPlannerPdf,
  getWeekDateRange,
  getWeekId,
} from "../services/generator";

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

      try {
        // Call the API route for server-side PDF generation
        const response = await fetch("/api/planner", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekId,
            subjects,
            vaultPath,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error ?? "Failed to generate PDF");
        }

        const blob = await response.blob();
        setState({ status: "generated", blob });
      } catch (error) {
        console.error("PDF generation error:", error);
        setState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate planner PDF",
        });
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
