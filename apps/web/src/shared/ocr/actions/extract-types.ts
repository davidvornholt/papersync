import { Data } from 'effect';
import type { OCRResponse, WeekId } from '@/shared/types/schemas';
/**
 * Types and Error Classes for OCR Extraction
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

export class ExtractionValidationError extends Data.TaggedError(
  'ExtractionValidationError',
)<{
  readonly message: string;
}> {}

export type VaultSettings = {
  readonly method: 'local' | 'github';
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
};

export type ExtractionOptions = {
  readonly imageBase64: string;
  readonly weekId: WeekId;
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
  readonly vaultSettings?: VaultSettings;
};

export type ExtractionResult =
  | {
      readonly success: true;
      readonly data: OCRResponse;
      readonly modelUsed: string;
    }
  | { readonly success: false; readonly error: string };
