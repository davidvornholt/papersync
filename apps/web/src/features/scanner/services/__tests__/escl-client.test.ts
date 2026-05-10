import { afterEach, describe, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import { Effect } from 'effect';
import type {
  ColorMode,
  ScannerCapabilities,
  ScanSettings,
} from '../escl-client';
import { ESCLClient, ESCLClientLayer } from '../escl-client';
import type { DiscoveredScanner } from '../scanner-discovery-types';

let server: Server | null = null;

afterEach(() => {
  if (server) {
    server.close();
    server = null;
  }
});

describe('eSCL Client Types', () => {
  describe('ColorMode', () => {
    it('should accept valid color modes', () => {
      const modes: ColorMode[] = ['color', 'grayscale', 'blackwhite'];
      expect(modes).toHaveLength(3);
    });
  });

  describe('ScanSettings', () => {
    it('should create valid scan settings', () => {
      const settings: ScanSettings = {
        colorMode: 'color',
        resolution: 300,
        format: 'jpeg',
        inputSource: 'Platen',
      };

      expect(settings.colorMode).toBe('color');
      expect(settings.resolution).toBe(300);
      expect(settings.format).toBe('jpeg');
      expect(settings.inputSource).toBe('Platen');
    });
  });

  describe('ScannerCapabilities', () => {
    it('should create valid scanner capabilities', () => {
      const caps: ScannerCapabilities = {
        inputSources: ['Platen', 'Adf'],
        sourceCapabilities: {
          Platen: {
            resolutions: [75, 150, 300, 600],
            colorModes: ['color', 'grayscale'],
          },
          Adf: {
            resolutions: [150, 300],
            colorModes: ['color', 'grayscale', 'blackwhite'],
          },
        },
        formats: ['application/pdf', 'image/jpeg'],
        maxWidth: 2550,
        maxHeight: 3300,
        minWidth: 16,
        minHeight: 16,
      };

      expect(caps.inputSources).toContain('Platen');
      expect(caps.sourceCapabilities.Platen.resolutions).toContain(300);
      expect(caps.sourceCapabilities.Adf.colorModes).toContain('color');
      expect(caps.formats).toContain('image/jpeg');
    });
  });

  describe('getCapabilities', () => {
    it('fetches and parses scanner capabilities', async () => {
      server = createServer((request, response) => {
        if (request.url !== '/eSCL/ScannerCapabilities') {
          response.writeHead(404);
          response.end();
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/xml' });
        response.end(`<?xml version="1.0" encoding="UTF-8"?>
<scan:ScannerCapabilities xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <scan:Platen>
    <scan:XResolution>300</scan:XResolution>
    <scan:XResolution>600</scan:XResolution>
    <scan:ColorMode>RGB24</scan:ColorMode>
  </scan:Platen>
  <pwg:DocumentFormat>image/jpeg</pwg:DocumentFormat>
  <scan:MaxWidth>2550</scan:MaxWidth>
  <scan:MaxHeight>3300</scan:MaxHeight>
</scan:ScannerCapabilities>`);
      });

      await new Promise<void>((resolve) => {
        server?.listen(0, '127.0.0.1', resolve);
      });

      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected TCP server address');
      }

      const scanner: DiscoveredScanner = {
        id: `http://127.0.0.1:${address.port}/eSCL`,
        name: 'FamilyV Printer',
        host: '127.0.0.1',
        port: address.port,
        protocol: 'http',
        resourcePath: '/eSCL',
        capabilities: {
          colorModes: ['color'],
          documentFormats: ['image/jpeg'],
        },
      };

      const capabilities = await Effect.runPromise(
        Effect.gen(function* () {
          const client = yield* ESCLClient;
          return yield* client.getCapabilities(scanner);
        }).pipe(Effect.provide(ESCLClientLayer)),
      );

      expect(capabilities.inputSources).toEqual(['Platen']);
      expect(capabilities.sourceCapabilities.Platen.resolutions).toEqual([
        300, 600,
      ]);
      expect(capabilities.sourceCapabilities.Platen.colorModes).toEqual([
        'color',
      ]);
      expect(capabilities.formats).toEqual(['image/jpeg']);
    });
  });
});
