import http from 'node:http';
import https from 'node:https';
import { Effect, Layer } from 'effect';
import {
  ESCLCapabilitiesError,
  ESCLError,
} from '@/features/scanner/errors/escl-types';
import type { DiscoveredScanner } from '@/features/scanner/services/scanner-discovery-types';
import type { ESCLClient } from './escl-types';
import { ESCLClient as ESCLClientTag, type ScanSettings } from './escl-types';
import { getScannerResourceBaseUrl, resolveScannerLocation } from './escl-url';
import { createScanRequestXml, parseCapabilitiesXml } from './escl-xml';

const successStatus = 200;
const redirectStatus = 300;
const createdStatus = 201;
const scanWarmupMilliseconds = 2000;
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

const getHeaderValue = (value: string | Array<string> | undefined) =>
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
        const chunks: Array<Buffer> = [];
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

  const { cause } = error;
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
          headers: { accept: 'text/xml, application/xml' },
        }).then((response) => {
          if (
            response.statusCode < successStatus ||
            response.statusCode >= redirectStatus
          ) {
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
          headers: { 'content-type': 'text/xml; charset=utf-8' },
          body: createScanRequestXml(settings),
        });
      },
      catch: (error) =>
        new ESCLError({ message: 'Failed to start scan job', cause: error }),
    }).pipe(
      Effect.flatMap((response) => {
        if (response.statusCode !== createdStatus) {
          return Effect.fail(
            new ESCLError({
              message: `Failed to create scan job: HTTP ${response.statusCode}`,
            }),
          );
        }

        const jobUrl = getHeaderValue(response.headers.location);
        if (!jobUrl) {
          return Effect.fail(
            new ESCLError({ message: 'No job URL returned from scanner' }),
          );
        }

        return resolveScannerLocation(scanner, jobUrl).pipe(
          Effect.map((resolvedJobUrl) => ({
            jobUrl: resolvedJobUrl,
            status: 'pending' as const,
          })),
        );
      }),
    ),

  getScanResult: (jobUrl: string) =>
    Effect.tryPromise({
      try: () =>
        new Promise<void>((resolve) =>
          setTimeout(resolve, scanWarmupMilliseconds),
        )
          .then(() =>
            requestScanner(`${jobUrl}/NextDocument`, {
              method: 'GET',
            }),
          )
          .then((response) => {
            if (
              response.statusCode < successStatus ||
              response.statusCode >= redirectStatus
            ) {
              return Promise.reject(
                new Error(
                  `Failed to get scan result: HTTP ${response.statusCode}`,
                ),
              );
            }

            const contentType =
              response.headers['content-type'] || 'image/jpeg';
            return `data:${contentType};base64,${response.body.toString('base64')}`;
          }),
      catch: (error) =>
        new ESCLError({
          message: 'Failed to retrieve scan result',
          cause: error,
        }),
    }),
});

export const ESCLClientLayer: Layer.Layer<ESCLClient, never, never> =
  Layer.succeed(ESCLClientTag, createESCLClient());
