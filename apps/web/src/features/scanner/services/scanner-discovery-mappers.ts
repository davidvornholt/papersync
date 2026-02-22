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
    colorModes,
    documentFormats,
  };
};

export const serviceToScanner = (
  service: Service,
  protocol: ScannerProtocol,
): DiscoveredScanner => {
  const parsed = parseTxtRecord((service.txt || {}) as Record<string, unknown>);
  return {
    id: `${protocol}://${service.host}:${service.port}`,
    name: service.name || 'Unknown Scanner',
    host: service.host || service.addresses?.[0] || 'unknown',
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
          : ['color', 'grayscale'],
      documentFormats:
        parsed.documentFormats && parsed.documentFormats.length > 0
          ? parsed.documentFormats
          : ['application/pdf', 'image/jpeg'],
    },
  };
};
