'use server';

import { Effect, Schema } from 'effect';
import { requireSession } from '@/shared/auth/session';
import {
  ESCLClient,
  ScanSettingsSchema,
} from '@/features/scanner/services/escl-types';
import { DiscoveredScannerSchema } from '@/features/scanner/services/scanner-discovery-types';
import { ESCLClientLayer } from '../services/escl-client';
export type ScanFromDeviceResult =
  | { readonly success: true; readonly imageData: string }
  | { readonly success: false; readonly error: string };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Scanner request failed.';

export const scanFromDevice = async (
  scanner: unknown,
  settings: unknown,
): Promise<ScanFromDeviceResult> => {
  await requireSession();
  const program = Effect.gen(function* () {
    const decodedScanner = yield* Schema.decodeUnknown(DiscoveredScannerSchema)(
      scanner,
    );
    const decodedSettings =
      yield* Schema.decodeUnknown(ScanSettingsSchema)(settings);
    const client = yield* ESCLClient;

    // Start the scan job
    const job = yield* client.startScan(decodedScanner, decodedSettings);

    // Retrieve the scanned image
    const imageData = yield* client.getScanResult(job.jobUrl);

    return imageData;
  }).pipe(
    Effect.provide(ESCLClientLayer),
    Effect.map((imageData) => ({ success: true as const, imageData })),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false as const,
        error: getErrorMessage(error),
      }),
    ),
  );

  return Effect.runPromise(program);
};
