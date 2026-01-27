"use client";

import { useCallback, useState } from "react";
import { extractHandwriting } from "@/app/features/ocr/actions";
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
};

export type ScanState =
  | { readonly status: "idle" }
  | { readonly status: "uploading"; readonly progress: number }
  | { readonly status: "processing" }
  | {
      readonly status: "complete";
      readonly entries: readonly ExtractedEntry[];
      readonly confidence: number;
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
};

export type UseScanReturn = {
  readonly state: ScanState;
  readonly imagePreview: string | null;
  readonly upload: (file: File) => Promise<void>;
  readonly process: () => Promise<void>;
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
// Hook
// ============================================================================

export const useScan = (options: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  const weekId = options.weekId ?? getCurrentWeekId();

  const upload = useCallback(async (file: File): Promise<void> => {
    setState({ status: "uploading", progress: 0 });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setState({ status: "uploading", progress });
        }
      };

      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setImageData(result);
        setState({ status: "idle" });
        resolve();
      };

      reader.onerror = () => {
        setState({ status: "error", error: "Failed to read file" });
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const process = useCallback(async (): Promise<void> => {
    if (!imageData) {
      setState({ status: "error", error: "No image to process" });
      return;
    }

    setState({ status: "processing" });

    try {
      const result = await extractHandwriting({
        imageBase64: imageData,
        weekId,
        existingContent: "", // TODO: Could fetch existing note content here
        provider: options.aiSettings.provider,
        googleApiKey: options.aiSettings.googleApiKey,
        ollamaEndpoint: options.aiSettings.ollamaEndpoint,
      });

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
          }),
        );

        setState({
          status: "complete",
          entries,
          confidence: result.data.confidence,
        });
      } else {
        setState({ status: "error", error: result.error });
      }
    } catch (error) {
      setState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during extraction",
      });
    }
  }, [imageData, weekId, options.aiSettings]);

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
