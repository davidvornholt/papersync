import { Context, type Effect, Schema } from 'effect';
import type {
  ESCLCapabilitiesError,
  ESCLError,
} from '@/features/scanner/errors/escl-types';
import type { DiscoveredScanner } from '@/features/scanner/services/scanner-discovery-types';
export type ColorMode = 'color' | 'grayscale' | 'blackwhite';

export type InputSource = 'Platen' | 'Adf';

export type ScanSettings = {
  readonly colorMode: ColorMode;
  readonly resolution: number;
  readonly format: 'pdf' | 'jpeg' | 'png';
  readonly inputSource: InputSource;
};

export const ScanSettingsSchema = Schema.Struct({
  colorMode: Schema.Literal('color', 'grayscale', 'blackwhite'),
  resolution: Schema.Number,
  format: Schema.Literal('pdf', 'jpeg', 'png'),
  inputSource: Schema.Literal('Platen', 'Adf'),
});

export type SourceCapabilities = {
  readonly resolutions: ReadonlyArray<number>;
  readonly colorModes: ReadonlyArray<ColorMode>;
};

export type ScannerCapabilities = {
  readonly inputSources: ReadonlyArray<InputSource>;
  readonly sourceCapabilities: Readonly<
    Record<InputSource, SourceCapabilities>
  >;
  readonly formats: ReadonlyArray<string>;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly minWidth: number;
  readonly minHeight: number;
};

export type ScanJob = {
  readonly jobUrl: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
};

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
