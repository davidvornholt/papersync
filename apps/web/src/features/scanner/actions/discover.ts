'use server';

import { Effect, Schema } from 'effect';
import {
  ESCLClient,
  type ScannerCapabilities,
} from '@/features/scanner/services/escl-types';
import {
  type DiscoveredScanner,
  DiscoveredScannerSchema,
  ScannerDiscoveryService,
} from '@/features/scanner/services/scanner-discovery-types';
import { requireSession } from '@/shared/auth/session';
import { ESCLClientLayer } from '../services/escl-client';
import { MdnsDiscoveryLayer } from '../services/scanner-discovery';
export type DiscoveryResult =
  | {
      readonly success: true;
      readonly scanners: ReadonlyArray<DiscoveredScanner>;
    }
  | { readonly success: false; readonly error: string };

export type CapabilitiesResult =
  | { readonly success: true; readonly capabilities: ScannerCapabilities }
  | { readonly success: false; readonly error: string };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Scanner request failed.';

export const discoverScanners = async (
  timeoutMs: unknown = 5000,
): Promise<DiscoveryResult> => {
  await requireSession();
  const program = Effect.gen(function* () {
    const decodedTimeout = yield* Schema.decodeUnknown(Schema.Number)(
      timeoutMs,
    );
    const discovery = yield* ScannerDiscoveryService;
    return yield* discovery.discover(decodedTimeout);
  }).pipe(
    Effect.provide(MdnsDiscoveryLayer),
    Effect.map((scanners) => ({ success: true as const, scanners })),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false as const,
        error: getErrorMessage(error),
      }),
    ),
  );

  return Effect.runPromise(program);
};

export const getScannerCapabilities = async (
  scanner: unknown,
): Promise<CapabilitiesResult> => {
  await requireSession();
  const program = Effect.gen(function* () {
    const decodedScanner = yield* Schema.decodeUnknown(DiscoveredScannerSchema)(
      scanner,
    );
    const client = yield* ESCLClient;
    return yield* client.getCapabilities(decodedScanner);
  }).pipe(
    Effect.provide(ESCLClientLayer),
    Effect.map((capabilities) => ({ success: true as const, capabilities })),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false as const,
        error: getErrorMessage(error),
      }),
    ),
  );

  return Effect.runPromise(program);
};
