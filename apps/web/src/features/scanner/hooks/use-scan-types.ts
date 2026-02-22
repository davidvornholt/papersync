import type { VaultSettings } from '@/shared/services/ocr-actions';
import type { WeekId } from '@/shared/types';

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
  | { readonly status: 'idle' }
  | { readonly status: 'uploading'; readonly progress: number }
  | { readonly status: 'processing' }
  | {
      readonly status: 'complete';
      readonly entries: readonly ExtractedEntry[];
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
