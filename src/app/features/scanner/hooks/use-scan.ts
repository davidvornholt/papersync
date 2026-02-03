"use client";

import { Effect } from "effect";
import { useCallback, useState } from "react";
import {
  extractHandwriting,
  type VaultSettings,
} from "@/app/features/ocr/actions";
import type { WeekId } from "@/app/shared/types";

// ============================================================================
// Types (local to scanner feature)
// ============================================================================

export type ExtractedEntry = {
  readonly id: string;
  readonly day: string;
  readonly subject: string;
  readonly content: string;
  readonly isTask: boolean;
  readonly isCompleted: boolean;
  readonly isNew: boolean;
  readonly dueDate?: string;
};

export type ScanState =
  | { readonly status: "idle" }
  | { readonly status: "uploading"; readonly progress: number }
  | { readonly status: "processing" }
  | {
      readonly status: "complete";
      readonly entries: readonly ExtractedEntry[];
      readonly confidence: number;
      readonly modelUsed: string;
    }
  | { readonly status: "error"; readonly error: string };

export type AISettings = {
  readonly provider: "google" | "ollama";
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export type UseScanOptions = {
  readonly aiSettings: AISettings;
  readonly weekId?: WeekId;
  readonly vaultSettings?: VaultSettings;
};

export type UseScanReturn = {
  readonly state: ScanState;
  readonly imagePreview: string | null;
  readonly upload: (file: File) => Promise<void>;
  readonly process: () => Promise<ScanState>;
  readonly clear: () => void;
};

// ============================================================================
// Helper: Get current week ID
// ============================================================================

const getCurrentWeekId = (): WeekId => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}` as WeekId;
};

// ============================================================================
// Effect-Based Helpers
// ============================================================================

const readFileAsDataUrl = (
  file: File,
  onProgress: (progress: number) => void,
): Effect.Effect<string, Error> =>
  Effect.async<string, Error>((resume) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    reader.onload = (event) => {
      const result = event.target?.result as string;
      resume(Effect.succeed(result));
    };

    reader.onerror = () => {
      resume(Effect.fail(new Error("Failed to read file")));
    };

    reader.readAsDataURL(file);
  });

const processExtractionEffect = (
  imageData: string,
  weekId: WeekId,
  aiSettings: AISettings,
  vaultSettings?: VaultSettings,
): Effect.Effect<ScanState, never> =>
  Effect.tryPromise({
    try: async () =>
      extractHandwriting({
        imageBase64: imageData,
        weekId,
        provider: aiSettings.provider,
        googleApiKey: aiSettings.googleApiKey,
        ollamaEndpoint: aiSettings.ollamaEndpoint,
        vaultSettings,
      }),
    catch: (error): Error =>
      error instanceof Error
        ? error
        : new Error("Unknown error during extraction"),
  }).pipe(
    Effect.flatMap((result): Effect.Effect<ScanState, never> => {
      if (result.success) {
        // Transform OCRResponse entries to ExtractedEntry format
        const entries: ExtractedEntry[] = result.data.entries.map(
          (entry, index) => ({
            id: `entry-${Date.now()}-${index}`,
            day: entry.day,
            subject: entry.subject,
            content: entry.content,
            isTask: entry.isTask,
            isCompleted: entry.isCompleted,
            isNew: entry.action === "add",
            dueDate: entry.dueDate,
          }),
        );

        return Effect.succeed({
          status: "complete" as const,
          entries,
          confidence: result.data.confidence,
          modelUsed: result.modelUsed,
        });
      }

      return Effect.succeed({
        status: "error" as const,
        error: result.error,
      });
    }),
    Effect.catchAll((error: Error) =>
      Effect.succeed<ScanState>({
        status: "error" as const,
        error: error.message,
      }),
    ),
  );

// ============================================================================
// Hook
// ============================================================================

export const useScan = (options: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  const weekId = options.weekId ?? getCurrentWeekId();

  const upload = useCallback(async (file: File): Promise<void> => {
    setState({ status: "uploading", progress: 0 });

    const result = await Effect.runPromise(
      readFileAsDataUrl(file, (progress) => {
        setState({ status: "uploading", progress });
      }).pipe(
        Effect.map((data) => ({ success: true as const, data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );

    if (result.success) {
      setImagePreview(result.data);
      setImageData(result.data);
      setState({ status: "idle" });
    } else {
      setState({ status: "error", error: result.error });
    }
  }, []);

  const process = useCallback(async (): Promise<ScanState> => {
    if (!imageData) {
      const newState: ScanState = {
        status: "error",
        error: "No image to process",
      };
      setState(newState);
      return newState;
    }

    setState({ status: "processing" });

    const newState = await Effect.runPromise(
      processExtractionEffect(
        imageData,
        weekId,
        options.aiSettings,
        options.vaultSettings,
      ),
    );

    setState(newState);
    return newState;
  }, [imageData, weekId, options.aiSettings, options.vaultSettings]);

  const clear = useCallback((): void => {
    setState({ status: "idle" });
    setImagePreview(null);
    setImageData(null);
  }, []);

  return {
    state,
    imagePreview,
    upload,
    process,
    clear,
  };
};
