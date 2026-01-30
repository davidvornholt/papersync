"use client";

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

    try {
      const result = await extractHandwriting({
        imageBase64: imageData,
        weekId,
        provider: options.aiSettings.provider,
        googleApiKey: options.aiSettings.googleApiKey,
        ollamaEndpoint: options.aiSettings.ollamaEndpoint,
        vaultSettings: options.vaultSettings,
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
            dueDate: entry.dueDate,
          }),
        );

        const newState: ScanState = {
          status: "complete",
          entries,
          confidence: result.data.confidence,
          modelUsed: result.modelUsed,
        };
        setState(newState);
        return newState;
      }

      const newState: ScanState = { status: "error", error: result.error };
      setState(newState);
      return newState;
    } catch (error) {
      const newState: ScanState = {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during extraction",
      };
      setState(newState);
      return newState;
    }
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
