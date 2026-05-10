import http from 'node:http';
import https from 'node:https';
import { Effect, Layer } from 'effect';
import type { ESCLClient } from './escl-types';
import {
  ESCLCapabilitiesError,
  ESCLClient as ESCLClientTag,
  ESCLError,
  type ScanSettings,
} from './escl-types';
import { getScannerResourceBaseUrl, resolveScannerLocation } from './escl-url';
import { createScanRequestXml, parseCapabilitiesXml } from './escl-xml';
import type { DiscoveredScanner } from './scanner-discovery';

export {
  type ColorMode,
  ESCLCapabilitiesError,
  ESCLClient,
  ESCLError,
  type InputSource,
  type ScanJob,
  type ScannerCapabilities,
  type ScanSettings,
  type SourceCapabilities,
} from './escl-types';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

type ScannerRequestOptions = {
  readonly method: 'GET' | 'POST';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
};

type ScannerResponse = {
  readonly statusCode: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: Buffer;
};

const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const requestScanner = (
  url: string,
  options: ScannerRequestOptions,
): Promise<ScannerResponse> =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const request = transport.request(
      parsedUrl,
      {
        method: options.method,
        headers: options.headers,
        agent: parsedUrl.protocol === 'https:' ? insecureAgent : undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    request.on('error', reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });

const getCauseMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause;
  if (cause instanceof Error && cause.message !== error.message) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
};

const createESCLClient = (): ESCLClient => ({
  getCapabilities: (scanner: DiscoveredScanner) =>
    Effect.tryPromise({
      try: () => {
        const scannerBaseUrl = getScannerResourceBaseUrl(scanner);
        const capabilitiesUrl = `${scannerBaseUrl}/ScannerCapabilities`;

        return requestScanner(capabilitiesUrl, {
          method: 'GET',
          headers: { Accept: 'text/xml, application/xml' },
        }).then((response) => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return Promise.reject(new Error(`HTTP ${response.statusCode}`));
          }
          return parseCapabilitiesXml(response.body.toString('utf8'));
        });
      },
      catch: (error) =>
        new ESCLCapabilitiesError({
          message: `Failed to fetch scanner capabilities from ${scanner.name} (${getScannerResourceBaseUrl(scanner)}): ${getCauseMessage(error)}`,
          cause: error,
        }),
    }),

  startScan: (scanner: DiscoveredScanner, settings: ScanSettings) =>
    Effect.tryPromise({
      try: () => {
        const scannerBaseUrl = getScannerResourceBaseUrl(scanner);
        const scanJobsUrl = `${scannerBaseUrl}/ScanJobs`;

        return requestScanner(scanJobsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: createScanRequestXml(settings),
        }).then((response) => {
          if (response.statusCode !== 201) {
            return Promise.reject(
              new Error(
                `Failed to create scan job: HTTP ${response.statusCode}`,
              ),
            );
          }

          const jobUrl = getHeaderValue(response.headers.location);
          if (!jobUrl) {
            return Promise.reject(
              new Error('No job URL returned from scanner'),
            );
          }

          return {
            jobUrl: resolveScannerLocation(scanner, jobUrl),
            status: 'pending' as const,
          };
        });
      },
      catch: (error) =>
        new ESCLError({ message: 'Failed to start scan job', cause: error }),
    }),

  getScanResult: (jobUrl: string) =>
    Effect.tryPromise({
      try: () => {
        return new Promise<void>((resolve) => setTimeout(resolve, 2000))
          .then(() =>
            requestScanner(`${jobUrl}/NextDocument`, {
              method: 'GET',
            }),
          )
          .then((response) => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              return Promise.reject(
                new Error(
                  `Failed to get scan result: HTTP ${response.statusCode}`,
                ),
              );
            }

            const contentType =
              response.headers['content-type'] || 'image/jpeg';
            return `data:${contentType};base64,${response.body.toString('base64')}`;
          });
      },
      catch: (error) =>
        new ESCLError({
          message: 'Failed to retrieve scan result',
          cause: error,
        }),
    }),
});

export const ESCLClientLayer: Layer.Layer<ESCLClient, never, never> =
  Layer.succeed(ESCLClientTag, createESCLClient());
