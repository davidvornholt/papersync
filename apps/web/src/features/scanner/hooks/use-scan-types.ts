import type { ToastType } from '@/shared/components/use-toast';
import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';

/** A prepared photo of one side of the planner sheet. */
export type ScanPage = {
  readonly id: string;
  readonly image: Blob;
};

export type CompletedScan = {
  readonly weekId: WeekId | null;
  readonly confidence: number;
  readonly modelUsed: string;
  readonly notes?: string;
};

export type ScanState =
  | { readonly status: 'idle' }
  // A null job id means the photos are still uploading.
  | { readonly status: 'processing'; readonly jobId: string | null }
  | ({ readonly status: 'complete' } & CompletedScan)
  | { readonly status: 'error'; readonly error: string };

export type AISettings = {
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export type ScanNotify = (message: string, type: ToastType) => void;

export type UseScanOptions = {
  readonly aiSettings: AISettings;
  readonly notify: ScanNotify;
};

export type UseScanReturn = {
  readonly state: ScanState;
  readonly isRestoring: boolean;
  readonly isPreparing: boolean;
  readonly pages: ReadonlyArray<ScanPage>;
  readonly pageLimit: number;
  readonly addPages: (files: ReadonlyArray<Blob>) => void;
  readonly removePage: (id: string) => void;
  readonly weekId: WeekId | null;
  readonly setWeekId: (value: string) => void;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly updateEntry: (id: string, updates: Partial<ExtractedEntry>) => void;
  readonly deleteEntry: (id: string) => void;
  readonly isUpdatingWeek: boolean;
  readonly canSave: boolean;
  readonly applyWeek: () => void;
  readonly analyze: () => void;
  readonly cancel: () => void;
  readonly clear: () => void;
};
