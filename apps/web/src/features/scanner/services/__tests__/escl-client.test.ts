import { afterEach, describe, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import { Effect } from 'effect';
import { ESCLClient } from '@/features/scanner/services/escl-types';
import { ESCLClientLayer } from '../escl-client';
import type { DiscoveredScanner } from '../scanner-discovery-types';

const standardResolution = 300;
const highResolution = 600;
const notFoundStatus = 404;
const successStatus = 200;

let server: Server | null = null;

afterEach(() => {
  if (server) {
    server.close();
    server = null;
  }
});

describe('eSCL Client Types', () => {
  describe('getCapabilities', () => {
    it('fetches and parses scanner capabilities', async () => {
      server = createServer((request, response) => {
        if (request.url !== '/eSCL/ScannerCapabilities') {
          response.writeHead(notFoundStatus);
          response.end();
          return;
        }

        response.writeHead(successStatus, { 'content-type': 'text/xml' });
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
        standardResolution,
        highResolution,
      ]);
      expect(capabilities.sourceCapabilities.Platen.colorModes).toEqual([
        'color',
      ]);
      expect(capabilities.formats).toEqual(['image/jpeg']);
    });
  });
});
