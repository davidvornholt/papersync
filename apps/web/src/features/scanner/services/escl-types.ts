import { Context, Data, type Effect } from 'effect';
import type { DiscoveredScanner } from './scanner-discovery';

export type ColorMode = 'color' | 'grayscale' | 'blackwhite';

export type InputSource = 'Platen' | 'Adf';

export type ScanSettings = {
  readonly colorMode: ColorMode;
  readonly resolution: number;
  readonly format: 'pdf' | 'jpeg' | 'png';
  readonly inputSource: InputSource;
};

export type SourceCapabilities = {
  readonly resolutions: readonly number[];
  readonly colorModes: readonly ColorMode[];
};

export type ScannerCapabilities = {
  readonly inputSources: readonly InputSource[];
  readonly sourceCapabilities: Readonly<
    Record<InputSource, SourceCapabilities>
  >;
  readonly formats: readonly string[];
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly minWidth: number;
  readonly minHeight: number;
};

export type ScanJob = {
  readonly jobUrl: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
};

export class ESCLError extends Data.TaggedError('ESCLError')<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

export class ESCLCapabilitiesError extends Data.TaggedError(
  'ESCLCapabilitiesError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type ESCLClient = {
  readonly getCapabilities: (
    scanner: DiscoveredScanner,
  ) => Effect.Effect<ScannerCapabilities, ESCLCapabilitiesError>;
  readonly startScan: (
    scanner: DiscoveredScanner,
    settings: ScanSettings,
  ) => Effect.Effect<ScanJob, ESCLError>;
  readonly getScanResult: (jobUrl: string) => Effect.Effect<string, ESCLError>;
};

export const ESCLClient = Context.GenericTag<ESCLClient>('ESCLClient');
