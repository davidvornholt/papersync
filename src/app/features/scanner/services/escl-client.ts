import { Agent } from "undici";
import { Context, Data, Effect, Layer } from "effect";
import type { DiscoveredScanner } from "./scanner-discovery";

// ============================================================================
// HTTPS Agent for Self-Signed Certificates
// ============================================================================

// Printers typically use self-signed HTTPS certificates.
// Create a custom undici Agent that accepts them for local network communication.
const insecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

// ============================================================================
// Types
// ============================================================================

export type ColorMode = "color" | "grayscale" | "blackwhite";

export type InputSource = "Platen" | "Adf";

export type ScanSettings = {
  readonly colorMode: ColorMode;
  readonly resolution: number;
  readonly format: "pdf" | "jpeg" | "png";
  readonly inputSource: InputSource;
};

export type SourceCapabilities = {
  readonly resolutions: readonly number[];
  readonly colorModes: readonly ColorMode[];
};

export type ScannerCapabilities = {
  readonly inputSources: readonly InputSource[];
  readonly sourceCapabilities: Readonly<Record<InputSource, SourceCapabilities>>;
  readonly formats: readonly string[];
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly minWidth: number;
  readonly minHeight: number;
};

export type ScanJob = {
  readonly jobUrl: string;
  readonly status: "pending" | "processing" | "completed" | "failed";
};

// ============================================================================
// Errors
// ============================================================================

export class ESCLError extends Data.TaggedError("ESCLError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

export class ESCLCapabilitiesError extends Data.TaggedError(
  "ESCLCapabilitiesError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Service Interface
// ============================================================================

export type ESCLClient = {
  readonly getCapabilities: (
    scanner: DiscoveredScanner,
  ) => Effect.Effect<ScannerCapabilities, ESCLCapabilitiesError>;

  readonly startScan: (
    scanner: DiscoveredScanner,
    settings: ScanSettings,
  ) => Effect.Effect<ScanJob, ESCLError>;

  readonly getScanResult: (jobUrl: string) => Effect.Effect<string, ESCLError>; // Returns base64 image
};

export const ESCLClient = Context.GenericTag<ESCLClient>("ESCLClient");

// ============================================================================
// XML Parsing Helpers
// ============================================================================

const parseXmlValue = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

const parseXmlValues = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  const matches: string[] = [];
  let matchResult: RegExpExecArray | null = regex.exec(xml);
  while (matchResult !== null) {
    matches.push(matchResult[1].trim());
    matchResult = regex.exec(xml);
  }
  return matches;
};

const parseCapabilitiesXml = (xml: string): ScannerCapabilities => {
  // Helper to extract a section from XML
  const extractSection = (sectionName: string): string | null => {
    const regex = new RegExp(`<scan:${sectionName}[^>]*>([\\s\\S]*?)</scan:${sectionName}>`, "i");
    const match = xml.match(regex);
    return match ? match[0] : null;
  };

  // Helper to parse resolutions from a section
  const parseResolutions = (section: string): number[] => {
    const resolutions: number[] = [];
    const resMatches = section.match(/<scan:XResolution>(\d+)<\/scan:XResolution>/gi) || [];
    for (const match of resMatches) {
      const value = parseInt(match.replace(/<\/?[^>]+>/g, ""), 10);
      if (!Number.isNaN(value) && !resolutions.includes(value)) {
        resolutions.push(value);
      }
    }
    return resolutions.length > 0 ? resolutions.sort((a, b) => a - b) : [75, 150, 300, 600];
  };

  // Helper to parse color modes from a section
  const parseColorModes = (section: string): ColorMode[] => {
    const colorModes: ColorMode[] = [];
    if (section.includes("RGB24") || section.includes("Color")) colorModes.push("color");
    if (section.includes("Grayscale8") || section.includes("Grayscale")) colorModes.push("grayscale");
    if (section.includes("BlackAndWhite1") || section.includes("Binary")) colorModes.push("blackwhite");
    return colorModes.length > 0 ? colorModes : ["color", "grayscale"];
  };

  // Parse input sources and their capabilities
  const inputSources: InputSource[] = [];
  const sourceCapabilities: Record<InputSource, SourceCapabilities> = {
    Platen: { resolutions: [300], colorModes: ["color", "grayscale"] },
    Adf: { resolutions: [300], colorModes: ["color", "grayscale"] },
  };

  // Check for Platen (flatbed glass) support
  const platenSection = extractSection("Platen");
  if (platenSection) {
    inputSources.push("Platen");
    sourceCapabilities.Platen = {
      resolutions: parseResolutions(platenSection),
      colorModes: parseColorModes(platenSection),
    };
  }

  // Check for ADF support
  const adfSection = extractSection("Adf");
  if (adfSection) {
    inputSources.push("Adf");
    sourceCapabilities.Adf = {
      resolutions: parseResolutions(adfSection),
      colorModes: parseColorModes(adfSection),
    };
  }

  // Default to Platen if no sources found
  if (inputSources.length === 0) {
    inputSources.push("Platen");
  }

  // Parse formats from DocumentFormat elements (global)
  const formats = parseXmlValues(xml, "pwg:DocumentFormat");
  if (formats.length === 0) {
    formats.push("application/pdf", "image/jpeg");
  }

  // Parse dimensions (in 1/300 inch units typically)
  const maxWidth = parseInt(parseXmlValue(xml, "scan:MaxWidth") || "2550", 10);
  const maxHeight = parseInt(parseXmlValue(xml, "scan:MaxHeight") || "3300", 10);
  const minWidth = parseInt(parseXmlValue(xml, "scan:MinWidth") || "16", 10);
  const minHeight = parseInt(parseXmlValue(xml, "scan:MinHeight") || "16", 10);

  return {
    inputSources,
    sourceCapabilities,
    formats,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,
  };
};

// ============================================================================
// eSCL Client Implementation
// ============================================================================

const createScanRequestXml = (settings: ScanSettings): string => {
  const colorModeMap: Record<ColorMode, string> = {
    color: "RGB24",
    grayscale: "Grayscale8",
    blackwhite: "BlackAndWhite1",
  };

  const formatMap: Record<string, string> = {
    pdf: "application/pdf",
    jpeg: "image/jpeg",
    png: "image/png",
  };

  // eSCL uses "Feeder" for ADF, "Platen" for flatbed glass
  const inputSourceMap: Record<InputSource, string> = {
    Platen: "Platen",
    Adf: "Feeder",
  };

  // A4 dimensions: 210mm x 297mm = 2480 x 3507 at 300dpi (ThreeHundredthsOfInches)
  const a4Width = 2480;
  const a4Height = 3507;

  return `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                   xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.0</pwg:Version>
  <scan:Intent>Document</scan:Intent>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
      <pwg:Width>${a4Width}</pwg:Width>
      <pwg:Height>${a4Height}</pwg:Height>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>${inputSourceMap[settings.inputSource]}</pwg:InputSource>
  <scan:ColorMode>${colorModeMap[settings.colorMode]}</scan:ColorMode>
  <scan:XResolution>${settings.resolution}</scan:XResolution>
  <scan:YResolution>${settings.resolution}</scan:YResolution>
  <pwg:DocumentFormat>${formatMap[settings.format]}</pwg:DocumentFormat>
</scan:ScanSettings>`;
};

const createESCLClient = (): ESCLClient => ({
  getCapabilities: (scanner) =>
    Effect.tryPromise({
      try: async () => {
        const baseUrl = `${scanner.protocol}://${scanner.host}:${scanner.port}`;
        // Use undici dispatcher option for self-signed certs in Node.js fetch
        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: "GET",
          headers: { Accept: "text/xml, application/xml" },
        };
        
        // For HTTPS, we need to bypass certificate validation for self-signed certs
        if (scanner.protocol === "https") {
          fetchOptions.dispatcher = insecureAgent;
        }
        
        const response = await fetch(`${baseUrl}/eSCL/ScannerCapabilities`, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xml = await response.text();
        return parseCapabilitiesXml(xml);
      },
      catch: (error) =>
        new ESCLCapabilitiesError({
          message: "Failed to fetch scanner capabilities",
          cause: error,
        }),
    }),

  startScan: (scanner, settings) =>
    Effect.tryPromise({
      try: async () => {
        const baseUrl = `${scanner.protocol}://${scanner.host}:${scanner.port}`;
        const requestXml = createScanRequestXml(settings);

        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
          body: requestXml,
        };
        
        // For HTTPS, bypass certificate validation for self-signed certs
        if (scanner.protocol === "https") {
          fetchOptions.dispatcher = insecureAgent;
        }

        const response = await fetch(`${baseUrl}/eSCL/ScanJobs`, fetchOptions);

        if (response.status !== 201) {
          throw new Error(`Failed to create scan job: HTTP ${response.status}`);
        }

        // Location header contains the job URL
        const jobUrl = response.headers.get("Location");
        if (!jobUrl) {
          throw new Error("No job URL returned from scanner");
        }

        return {
          jobUrl: jobUrl.startsWith("http") ? jobUrl : `${baseUrl}${jobUrl}`,
          status: "pending" as const,
        };
      },
      catch: (error) =>
        new ESCLError({
          message: "Failed to start scan job",
          cause: error,
        }),
    }),

  getScanResult: (jobUrl) =>
    Effect.tryPromise({
      try: async () => {
        // Poll for completion (simplified - real implementation would check status)
        const nextDocUrl = `${jobUrl}/NextDocument`;

        // Wait a moment for scan to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Use insecure agent for HTTPS URLs with self-signed certs
        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: "GET",
        };
        
        if (jobUrl.startsWith("https://")) {
          fetchOptions.dispatcher = insecureAgent;
        }

        const response = await fetch(nextDocUrl, fetchOptions);

        if (!response.ok) {
          throw new Error(`Failed to get scan result: HTTP ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType =
          response.headers.get("Content-Type") || "image/jpeg";

        return `data:${contentType};base64,${base64}`;
      },
      catch: (error) =>
        new ESCLError({
          message: "Failed to retrieve scan result",
          cause: error,
        }),
    }),
});

// ============================================================================
// Layer
// ============================================================================

export const ESCLClientLayer: Layer.Layer<ESCLClient, never, never> =
  Layer.succeed(ESCLClient, createESCLClient());
