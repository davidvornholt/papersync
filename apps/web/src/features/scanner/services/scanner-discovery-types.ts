import { Context, Data, type Effect } from 'effect';
export type ScannerProtocol = 'http' | 'https';

export type DiscoveredScanner = {
  readonly id: string;
  readonly name: string;
  readonly host: string;
  readonly port: number;
  readonly protocol: ScannerProtocol;
  readonly resourcePath: string;
  readonly model?: string;
  readonly manufacturer?: string;
  readonly uuid?: string;
  readonly adminUrl?: string;
  readonly capabilities: {
    readonly colorModes: ReadonlyArray<string>;
    readonly documentFormats: ReadonlyArray<string>;
  };
};

export class ScannerDiscoveryError extends Data.TaggedError(
  'ScannerDiscoveryError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type ScannerDiscoveryService = {
  readonly discover: (
    timeoutMs?: number,
  ) => Effect.Effect<ReadonlyArray<DiscoveredScanner>, ScannerDiscoveryError>;
};

export const ScannerDiscoveryService =
  Context.GenericTag<ScannerDiscoveryService>('ScannerDiscoveryService');
