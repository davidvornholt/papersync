import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';
export type ScanState =
  | { readonly status: 'idle' }
  | { readonly status: 'uploading'; readonly progress: number }
  | { readonly status: 'processing' }
  | {
      readonly status: 'complete';
      readonly weekId: WeekId | null;
      readonly entries: ReadonlyArray<ExtractedEntry>;
      readonly confidence: number;
      readonly modelUsed: string;
    }
  | { readonly status: 'error'; readonly error: string };

export type AISettings = {
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export type UseScanOptions = {
  readonly aiSettings: AISettings;
};

export type UseScanReturn = {
  readonly state: ScanState;
  readonly weekId: WeekId | null;
  readonly hasDetectedWeek: boolean;
  readonly setWeekId: (value: string) => void;
  readonly imagePreview: string | null;
  readonly upload: (file: File) => Promise<boolean>;
  readonly process: () => Promise<ScanState>;
  readonly clear: () => void;
};
