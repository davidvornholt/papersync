import { Effect, Layer } from 'effect';
import { Agent } from 'undici';
import type { ESCLClient } from './escl-types';
import {
  ESCLCapabilitiesError,
  ESCLClient as ESCLClientTag,
  ESCLError,
  type ScanSettings,
} from './escl-types';
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

const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

const createESCLClient = (): ESCLClient => ({
  getCapabilities: (scanner: DiscoveredScanner) =>
    Effect.tryPromise({
      try: async () => {
        const baseUrl = `${scanner.protocol}://${scanner.host}:${scanner.port}`;
        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: 'GET',
          headers: { Accept: 'text/xml, application/xml' },
        };
        if (scanner.protocol === 'https') {
          fetchOptions.dispatcher = insecureAgent;
        }

        const response = await fetch(
          `${baseUrl}/eSCL/ScannerCapabilities`,
          fetchOptions,
        );
        if (!response.ok) {
          return Promise.reject(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
          );
        }

        return parseCapabilitiesXml(await response.text());
      },
      catch: (error) =>
        new ESCLCapabilitiesError({
          message: 'Failed to fetch scanner capabilities',
          cause: error,
        }),
    }),

  startScan: (scanner: DiscoveredScanner, settings: ScanSettings) =>
    Effect.tryPromise({
      try: async () => {
        const baseUrl = `${scanner.protocol}://${scanner.host}:${scanner.port}`;
        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: createScanRequestXml(settings),
        };
        if (scanner.protocol === 'https') {
          fetchOptions.dispatcher = insecureAgent;
        }

        const response = await fetch(`${baseUrl}/eSCL/ScanJobs`, fetchOptions);
        if (response.status !== 201) {
          return Promise.reject(
            new Error(`Failed to create scan job: HTTP ${response.status}`),
          );
        }

        const jobUrl = response.headers.get('Location');
        if (!jobUrl) {
          return Promise.reject(new Error('No job URL returned from scanner'));
        }

        return {
          jobUrl: jobUrl.startsWith('http') ? jobUrl : `${baseUrl}${jobUrl}`,
          status: 'pending' as const,
        };
      },
      catch: (error) =>
        new ESCLError({ message: 'Failed to start scan job', cause: error }),
    }),

  getScanResult: (jobUrl: string) =>
    Effect.tryPromise({
      try: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
          method: 'GET',
        };
        if (jobUrl.startsWith('https://')) {
          fetchOptions.dispatcher = insecureAgent;
        }

        const response = await fetch(`${jobUrl}/NextDocument`, fetchOptions);
        if (!response.ok) {
          return Promise.reject(
            new Error(`Failed to get scan result: HTTP ${response.status}`),
          );
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType =
          response.headers.get('Content-Type') || 'image/jpeg';
        return `data:${contentType};base64,${base64}`;
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
