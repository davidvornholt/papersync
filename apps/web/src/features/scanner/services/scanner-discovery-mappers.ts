import type { Service } from 'bonjour-service';
import type {
  DiscoveredScanner,
  ScannerProtocol,
} from './scanner-discovery-types';

const parseTxtRecord = (
  txt: Record<string, unknown>,
): Partial<DiscoveredScanner['capabilities']> & {
  model?: string;
  manufacturer?: string;
  uuid?: string;
  adminUrl?: string;
  resourcePath: string;
} => {
  const colorModes: string[] = [];
  const documentFormats: string[] = [];

  const cs = txt.cs || txt.CS;
  if (typeof cs === 'string') {
    colorModes.push(
      ...cs
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  const pdl = txt.pdl || txt.PDL;
  if (typeof pdl === 'string') {
    documentFormats.push(
      ...pdl
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  return {
    model: typeof txt.ty === 'string' ? txt.ty : undefined,
    manufacturer: typeof txt.mfg === 'string' ? txt.mfg : undefined,
    uuid:
      typeof txt.UUID === 'string'
        ? txt.UUID
        : typeof txt.uuid === 'string'
          ? txt.uuid
          : undefined,
    adminUrl: typeof txt.adminurl === 'string' ? txt.adminurl : undefined,
    resourcePath: normalizeResourcePath(txt.rs || txt.RS),
    colorModes,
    documentFormats,
  };
};

const normalizeResourcePath = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '/eSCL';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '/eSCL';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/g, '');
  return withoutTrailingSlash || '/eSCL';
};

const isIpv4Address = (address: string): boolean =>
  /^\d{1,3}(?:\.\d{1,3}){3}$/.test(address);

const selectServiceHost = (service: Service): string =>
  service.addresses?.find(isIpv4Address) ??
  service.addresses?.find((address) => !address.startsWith('fe80:')) ??
  service.addresses?.[0] ??
  service.host ??
  'unknown';

export const serviceToScanner = (
  service: Service,
  protocol: ScannerProtocol,
): DiscoveredScanner => {
  const parsed = parseTxtRecord((service.txt || {}) as Record<string, unknown>);
  const host = selectServiceHost(service);

  return {
    id: `${protocol}://${host}:${service.port}${parsed.resourcePath}`,
    name: service.name || 'Unknown Scanner',
    host,
    port: service.port,
    protocol,
    resourcePath: parsed.resourcePath,
    model: parsed.model,
    manufacturer: parsed.manufacturer,
    uuid: parsed.uuid,
    adminUrl: parsed.adminUrl,
    capabilities: {
      colorModes:
        parsed.colorModes && parsed.colorModes.length > 0
          ? parsed.colorModes
          : ['color', 'grayscale'],
      documentFormats:
        parsed.documentFormats && parsed.documentFormats.length > 0
          ? parsed.documentFormats
          : ['application/pdf', 'image/jpeg'],
    },
  };
};
