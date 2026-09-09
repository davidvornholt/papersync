'use server';

import { Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import type {
  VisionError,
  VisionValidationError,
} from '@/shared/ocr/errors/vision-contract';
import { VisionProvider } from '@/shared/ocr/services/vision-contract';
import { getVisionLayer } from '@/shared/ocr/services/vision-selection';
import type { OCRResponse, WeekId } from '@/shared/types/schemas';
import { getWeeklyNotePath } from '@/shared/vault/services/config-paths';
import { makeLocalVaultLayer } from '@/shared/vault/services/filesystem';
import { VaultService } from '@/shared/vault/services/filesystem-contract';
import { githubService } from '@/shared/vault/services/github';
import type {
  ExtractionOptions,
  ExtractionResult,
  ExtractionValidationError,
  VaultSettings,
} from './extract-types';

/**
 * Server Actions for OCR Extraction
 *
 * Note: Types and error classes are in extract-types.ts because
 * "use server" files can only export async functions.
 */

const fetchExistingContentFromLocal = (
  weekId: WeekId,
  localPath: string,
): Effect.Effect<string, never> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const notePath = getWeeklyNotePath(weekId);
    const exists = yield* vault.fileExists(notePath);
    if (!exists) {
      return '';
    }
    return yield* vault.readFile(notePath);
  }).pipe(
    Effect.provide(makeLocalVaultLayer(localPath)),
    Effect.catchAll(() => Effect.succeed('')),
  );

const fetchExistingContentFromGitHub = (
  weekId: WeekId,
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<string, never> =>
  githubService
    .getFile({ token, owner, repo, path: getWeeklyNotePath(weekId) })
    .pipe(
      Effect.map((file) => file?.content ?? ''),
      Effect.orElseSucceed(() => ''),
    );

const fetchExistingContentEffect = (
  weekId: WeekId,
  vaultSettings?: VaultSettings,
): Effect.Effect<string, never> => {
  if (!vaultSettings) {
    return Effect.succeed('');
  }

  if (vaultSettings.method === 'local' && vaultSettings.localPath) {
    return fetchExistingContentFromLocal(weekId, vaultSettings.localPath);
  }

  if (
    vaultSettings.method === 'github' &&
    vaultSettings.githubToken &&
    vaultSettings.githubRepo
  ) {
    const [owner, repo] = vaultSettings.githubRepo.split('/');
    if (!(owner && repo)) {
      return Effect.succeed('');
    }
    return fetchExistingContentFromGitHub(
      weekId,
      vaultSettings.githubToken,
      owner,
      repo,
    );
  }

  return Effect.succeed('');
};

const extractHandwritingEffect = (
  options: ExtractionOptions,
): Effect.Effect<
  { readonly data: OCRResponse; readonly modelUsed: string },
  ExtractionValidationError | VisionError | VisionValidationError
> =>
  Effect.gen(function* () {
    const { imageBase64, weekId, vaultSettings } = options;
    const visionLayer = yield* getVisionLayer(options);

    // Fetch existing content from vault to provide context to AI
    const existingContent = yield* fetchExistingContentEffect(
      weekId,
      vaultSettings,
    );

    // Run the extraction with the vision provider
    const vision = yield* Effect.provide(VisionProvider, visionLayer);
    const result = yield* Effect.provide(
      vision.extractHandwriting(imageBase64, weekId, existingContent),
      visionLayer,
    );

    return { data: result.data, modelUsed: result.modelUsed };
  });

export const extractHandwriting = async (
  options: ExtractionOptions,
): Promise<ExtractionResult> => {
  await requireSession();
  return Effect.runPromise(
    extractHandwritingEffect(options).pipe(
      Effect.map((result) => ({
        success: true as const,
        data: result.data,
        modelUsed: result.modelUsed,
      })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
};
