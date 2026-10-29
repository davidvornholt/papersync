import { afterEach, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import { Effect } from 'effect';
import {
  ESCLClient,
  type InputSource,
} from '@/features/scanner/services/escl-types';
import { ESCLClientLayer } from '../escl-client';
import type { DiscoveredScanner } from '../scanner-discovery-types';

const createdStatus = 201;
const badRequestStatus = 400;
const notFoundStatus = 404;
const successStatus = 200;
const a4Width = 2480;
const a4Height = 3507;
const letterWidth = 2550;
const letterHeight = 3300;
const legalHeight = 4200;
const smallFeederWidth = 2400;

let server: Server | null = null;

afterEach(() => {
  server?.close();
  server = null;
});

const tagValue = (xml: string, tag: string): number =>
  Number(new RegExp(`<${tag}>(\\d+)</${tag}>`, 'u').exec(xml)?.[1]);

const inputCaps = (width: number, height: number) => `
      <scan:MaxWidth>${width}</scan:MaxWidth>
      <scan:MaxHeight>${height}</scan:MaxHeight>
      <scan:SettingProfiles><scan:SettingProfile><scan:ColorModes>
        <scan:ColorMode>RGB24</scan:ColorMode>
      </scan:ColorModes></scan:SettingProfile></scan:SettingProfiles>`;

type Limits = Readonly<Record<InputSource, { width: number; height: number }>>;

/** A scanner that rejects a scan region beyond the limits it advertises, as real ones do. */
const startScanner = async (limits: Limits) => {
  const requested: Array<{ width: number; height: number }> = [];
  server = createServer((request, response) => {
    if (
      request.method === 'GET' &&
      request.url === '/eSCL/ScannerCapabilities'
    ) {
      response.writeHead(successStatus, { 'content-type': 'text/xml' });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
<scan:ScannerCapabilities xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <scan:Platen><scan:PlatenInputCaps>${inputCaps(limits.Platen.width, limits.Platen.height)}
  </scan:PlatenInputCaps></scan:Platen>
  <scan:Adf><scan:AdfSimplexInputCaps>${inputCaps(limits.Adf.width, limits.Adf.height)}
  </scan:AdfSimplexInputCaps></scan:Adf>
</scan:ScannerCapabilities>`);
      return;
    }
    if (request.method === 'POST' && request.url === '/eSCL/ScanJobs') {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        const source: InputSource = body.includes('>Feeder<')
          ? 'Adf'
          : 'Platen';
        const region = {
          width: tagValue(body, 'pwg:Width'),
          height: tagValue(body, 'pwg:Height'),
        };
        requested.push(region);
        const fits =
          region.width <= limits[source].width &&
          region.height <= limits[source].height;
        response.writeHead(
          fits ? createdStatus : badRequestStatus,
          fits ? { location: '/eSCL/ScanJobs/1' } : {},
        );
        response.end();
      });
      return;
    }
    response.writeHead(notFoundStatus);
    response.end();
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
    name: 'Letter Scanner',
    host: '127.0.0.1',
    port: address.port,
    protocol: 'http',
    resourcePath: '/eSCL',
    capabilities: { colorModes: ['color'], documentFormats: ['image/jpeg'] },
  };
  return { requested, scanner };
};

const scan = (scanner: DiscoveredScanner, inputSource: InputSource) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* ESCLClient;
      return yield* client.startScan(scanner, {
        colorMode: 'color',
        resolution: 300,
        format: 'jpeg',
        inputSource,
      });
    }).pipe(Effect.provide(ESCLClientLayer)),
  );

it('scans an A4 page on a scanner that takes A4 or larger', async () => {
  const { requested, scanner } = await startScanner({
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Platen: { width: letterWidth, height: legalHeight },
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Adf: { width: letterWidth, height: legalHeight },
  });

  await scan(scanner, 'Platen');

  expect(requested).toEqual([{ width: a4Width, height: a4Height }]);
});

it('keeps the scan region within a Letter-sized glass', async () => {
  const { requested, scanner } = await startScanner({
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Platen: { width: letterWidth, height: letterHeight },
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Adf: { width: letterWidth, height: legalHeight },
  });

  const job = await scan(scanner, 'Platen');

  expect(job.status).toBe('pending');
  expect(requested).toEqual([{ width: a4Width, height: letterHeight }]);
});

it('keeps the scan region within the feeder when it is narrower than the glass', async () => {
  const { requested, scanner } = await startScanner({
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Platen: { width: letterWidth, height: legalHeight },
    // biome-ignore lint/style/useNamingConvention: eSCL protocol value required by scanners.
    Adf: { width: smallFeederWidth, height: legalHeight },
  });

  const job = await scan(scanner, 'Adf');

  expect(job.status).toBe('pending');
  expect(requested).toEqual([{ width: smallFeederWidth, height: a4Height }]);
});
