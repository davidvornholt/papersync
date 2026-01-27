import Bonjour, { type Service } from "bonjour-service";
import { Context, Data, Effect, Layer } from "effect";

// ============================================================================
// Types
// ============================================================================

export type ScannerProtocol = "http" | "https";

export type DiscoveredScanner = {
  readonly id: string;
  readonly name: string;
  readonly host: string;
  readonly port: number;
  readonly protocol: ScannerProtocol;
  readonly model?: string;
  readonly manufacturer?: string;
  readonly uuid?: string;
  readonly adminUrl?: string;
  readonly capabilities: {
    readonly colorModes: readonly string[];
    readonly documentFormats: readonly string[];
  };
};

// ============================================================================
// Errors
// ============================================================================

export class ScannerDiscoveryError extends Data.TaggedError(
  "ScannerDiscoveryError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Service Interface
// ============================================================================

export type ScannerDiscoveryService = {
  readonly discover: (
    timeoutMs?: number,
  ) => Effect.Effect<readonly DiscoveredScanner[], ScannerDiscoveryError>;
};

export const ScannerDiscoveryService =
  Context.GenericTag<ScannerDiscoveryService>("ScannerDiscoveryService");

// ============================================================================
// mDNS Discovery Implementation
// ============================================================================

const parseTxtRecord = (
  txt: Record<string, unknown>,
): Partial<DiscoveredScanner["capabilities"]> & {
  model?: string;
  manufacturer?: string;
  uuid?: string;
  adminUrl?: string;
} => {
  // TXT record keys from eSCL specification:
  // ty = device type/model
  // mfg = manufacturer
  // UUID = device UUID
  // adminurl = admin interface URL
  // cs = color modes (comma-separated)
  // pdl = supported document formats

  const colorModes: string[] = [];
  const documentFormats: string[] = [];

  const cs = txt.cs || txt.CS;
  if (typeof cs === "string") {
    colorModes.push(
      ...cs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const pdl = txt.pdl || txt.PDL;
  if (typeof pdl === "string") {
    documentFormats.push(
      ...pdl
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return {
    model: typeof txt.ty === "string" ? txt.ty : undefined,
    manufacturer: typeof txt.mfg === "string" ? txt.mfg : undefined,
    uuid:
      typeof txt.UUID === "string"
        ? txt.UUID
        : typeof txt.uuid === "string"
          ? txt.uuid
          : undefined,
    adminUrl: typeof txt.adminurl === "string" ? txt.adminurl : undefined,
    colorModes,
    documentFormats,
  };
};

const serviceToScanner = (
  service: Service,
  protocol: ScannerProtocol,
): DiscoveredScanner => {
  const txt = (service.txt || {}) as Record<string, unknown>;
  const parsed = parseTxtRecord(txt);

  // Generate a stable ID from host and port
  const id = `${protocol}://${service.host}:${service.port}`;

  return {
    id,
    name: service.name || "Unknown Scanner",
    host: service.host || service.addresses?.[0] || "unknown",
    port: service.port,
    protocol,
    model: parsed.model,
    manufacturer: parsed.manufacturer,
    uuid: parsed.uuid,
    adminUrl: parsed.adminUrl,
    capabilities: {
      colorModes:
        parsed.colorModes && parsed.colorModes.length > 0
          ? parsed.colorModes
          : ["color", "grayscale"],
      documentFormats:
        parsed.documentFormats && parsed.documentFormats.length > 0
          ? parsed.documentFormats
          : ["application/pdf", "image/jpeg"],
    },
  };
};

const createMdnsDiscoveryService = (): ScannerDiscoveryService => ({
  discover: (timeoutMs = 5000) =>
    Effect.tryPromise({
      try: async () => {
        const scanners = new Map<string, DiscoveredScanner>();
        const bonjour = new Bonjour();

        return new Promise<readonly DiscoveredScanner[]>((resolve) => {
          // Browse for HTTP scanners (_uscan._tcp)
          const httpBrowser = bonjour.find({ type: "uscan" });
          httpBrowser.on("up", (service: Service) => {
            const scanner = serviceToScanner(service, "http");
            scanners.set(scanner.id, scanner);
          });

          // Browse for HTTPS scanners (_uscans._tcp)
          const httpsBrowser = bonjour.find({ type: "uscans" });
          httpsBrowser.on("up", (service: Service) => {
            const scanner = serviceToScanner(service, "https");
            scanners.set(scanner.id, scanner);
          });

          // Stop after timeout and return results
          setTimeout(() => {
            httpBrowser.stop();
            httpsBrowser.stop();
            bonjour.destroy();
            resolve(Array.from(scanners.values()));
          }, timeoutMs);
        });
      },
      catch: (error) =>
        new ScannerDiscoveryError({
          message: "Failed to discover scanners via mDNS",
          cause: error,
        }),
    }),
});

// ============================================================================
// Layer
// ============================================================================

export const MdnsDiscoveryLayer: Layer.Layer<
  ScannerDiscoveryService,
  never,
  never
> = Layer.succeed(ScannerDiscoveryService, createMdnsDiscoveryService());
