'use server';

import { Effect } from 'effect';
import {
  ESCLClient,
  type ScannerCapabilities,
} from '@/features/scanner/services/escl-types';
import {
  type DiscoveredScanner,
  ScannerDiscoveryService,
} from '@/features/scanner/services/scanner-discovery-types';
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

export async function discoverScanners(
  timeoutMs = 5000,
): Promise<DiscoveryResult> {
  const program = Effect.gen(function* () {
    const discovery = yield* ScannerDiscoveryService;
    return yield* discovery.discover(timeoutMs);
  }).pipe(
    Effect.provide(MdnsDiscoveryLayer),
    Effect.map((scanners) => ({ success: true as const, scanners })),
    Effect.catchAll((error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}

export async function getScannerCapabilities(
  scanner: DiscoveredScanner,
): Promise<CapabilitiesResult> {
  const program = Effect.gen(function* () {
    const client = yield* ESCLClient;
    return yield* client.getCapabilities(scanner);
  }).pipe(
    Effect.provide(ESCLClientLayer),
    Effect.map((capabilities) => ({ success: true as const, capabilities })),
    Effect.catchAll((error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
