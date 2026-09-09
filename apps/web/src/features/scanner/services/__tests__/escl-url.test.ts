import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { getScannerResourceBaseUrl, resolveScannerLocation } from '../escl-url';
import type { DiscoveredScanner } from '../scanner-discovery-types';

const scanner: DiscoveredScanner = {
  id: 'https://192.168.1.42:443/eSCL',
  name: 'FamilyV Printer',
  host: '192.168.1.42',
  port: 443,
  protocol: 'https',
  resourcePath: '/eSCL',
  capabilities: {
    colorModes: ['color'],
    documentFormats: ['image/jpeg'],
  },
};

describe('eSCL URL helpers', () => {
  it('builds the scanner resource base URL', () => {
    expect(getScannerResourceBaseUrl(scanner)).toBe(
      'https://192.168.1.42:443/eSCL',
    );
  });

  it('formats IPv6 scanner hosts for URLs', () => {
    expect(
      getScannerResourceBaseUrl({
        ...scanner,
        host: '2001:db8::5',
      }),
    ).toBe('https://[2001:db8::5]:443/eSCL');
  });

  it('resolves scanner job locations relative to the origin', () => {
    expect(
      Effect.runSync(resolveScannerLocation(scanner, '/eSCL/ScanJobs/12')),
    ).toBe('https://192.168.1.42:443/eSCL/ScanJobs/12');
  });

  it('resolves scanner job locations relative to the resource base', () => {
    expect(Effect.runSync(resolveScannerLocation(scanner, 'ScanJobs/12'))).toBe(
      'https://192.168.1.42:443/eSCL/ScanJobs/12',
    );
  });

  it('rejects scanner job locations outside the scanner origin', async () => {
    await expect(
      Effect.runPromise(
        resolveScannerLocation(
          scanner,
          'https://169.254.169.254/latest/meta-data',
        ),
      ),
    ).rejects.toThrow('outside its origin');
  });
});
