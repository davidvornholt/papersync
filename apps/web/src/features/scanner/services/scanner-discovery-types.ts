import { Context, Data, Schema, type Effect } from 'effect';
export type ScannerProtocol = 'http' | 'https';

export const DiscoveredScannerSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  host: Schema.String,
  port: Schema.Number,
  protocol: Schema.Literal('http', 'https'),
  resourcePath: Schema.String,
  model: Schema.optional(Schema.String),
  manufacturer: Schema.optional(Schema.String),
  uuid: Schema.optional(Schema.String),
  adminUrl: Schema.optional(Schema.String),
  capabilities: Schema.Struct({
    colorModes: Schema.Array(Schema.String),
    documentFormats: Schema.Array(Schema.String),
  }),
});

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
