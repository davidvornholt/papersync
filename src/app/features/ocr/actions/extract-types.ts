import { Data } from 'effect';

/**
 * Types and Error Classes for OCR Extraction
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

// ============================================================================
// Error Types
// ============================================================================

export class ExtractionValidationError extends Data.TaggedError(
  'ExtractionValidationError',
)<{
  readonly message: string;
}> {}

// ============================================================================
// Types
// ============================================================================

export type VaultSettings = {
  readonly method: 'local' | 'github';
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
};

export type ExtractionOptions = {
  readonly imageBase64: string;
  readonly weekId: import('@/app/shared/types').WeekId;
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
  readonly vaultSettings?: VaultSettings;
};

// ============================================================================
// Result Types (for server action responses)
// ============================================================================

export type ExtractionResult =
  | {
      readonly success: true;
      readonly data: import('@/app/shared/types').OCRResponse;
      readonly modelUsed: string;
    }
  | { readonly success: false; readonly error: string };
