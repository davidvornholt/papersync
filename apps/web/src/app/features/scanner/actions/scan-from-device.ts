'use server';

import { Effect } from 'effect';
import {
  type DiscoveredScanner,
  ESCLClient,
  ESCLClientLayer,
  type ScanSettings,
} from '../services';

// ============================================================================
// Types
// ============================================================================

export type ScanFromDeviceResult =
  | { readonly success: true; readonly imageData: string }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Server Action
// ============================================================================

export async function scanFromDevice(
  scanner: DiscoveredScanner,
  settings: ScanSettings,
): Promise<ScanFromDeviceResult> {
  const program = Effect.gen(function* () {
    const client = yield* ESCLClient;

    // Start the scan job
    const job = yield* client.startScan(scanner, settings);

    // Retrieve the scanned image
    const imageData = yield* client.getScanResult(job.jobUrl);

    return imageData;
  }).pipe(
    Effect.provide(ESCLClientLayer),
    Effect.map((imageData) => ({ success: true as const, imageData })),
    Effect.catchAll((error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
