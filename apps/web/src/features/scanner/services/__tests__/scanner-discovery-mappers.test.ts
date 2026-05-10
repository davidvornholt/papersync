import { describe, expect, it } from 'bun:test';
import type { Service } from 'bonjour-service';
import { serviceToScanner } from '../scanner-discovery-mappers';

const createService = (overrides: Partial<Service>): Service =>
  ({
    name: 'FamilyV Printer',
    host: 'FamilyV-Printer.local',
    port: 443,
    txt: {},
    addresses: [],
    ...overrides,
  }) as Service;

describe('serviceToScanner', () => {
  it('uses the advertised IPv4 address and resource path', () => {
    const scanner = serviceToScanner(
      createService({
        txt: { rs: 'scan/eSCL', ty: 'Office Printer' },
        addresses: ['fe80::1234', '192.168.1.42'],
      }),
      'https',
    );

    expect(scanner.host).toBe('192.168.1.42');
    expect(scanner.resourcePath).toBe('/scan/eSCL');
    expect(scanner.id).toBe('https://192.168.1.42:443/scan/eSCL');
    expect(scanner.model).toBe('Office Printer');
  });

  it('falls back to the standard eSCL resource path', () => {
    const scanner = serviceToScanner(
      createService({ addresses: ['192.168.1.43'] }),
      'http',
    );

    expect(scanner.resourcePath).toBe('/eSCL');
  });
});
