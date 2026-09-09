import { Effect } from 'effect';
import { ESCLError } from '@/features/scanner/errors/escl-types';
import type { DiscoveredScanner } from './scanner-discovery-types';

const formatHostForUrl = (host: string): string =>
  host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;

export const getScannerOrigin = (scanner: DiscoveredScanner): string =>
  `${scanner.protocol}://${formatHostForUrl(scanner.host)}:${scanner.port}`;

export const getScannerResourceBaseUrl = (scanner: DiscoveredScanner): string =>
  `${getScannerOrigin(scanner)}${scanner.resourcePath}`;

const getResolvedLocation = (
  scanner: DiscoveredScanner,
  location: string,
): string => {
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return location;
  }

  if (location.startsWith('/')) {
    return `${getScannerOrigin(scanner)}${location}`;
  }

  return `${getScannerResourceBaseUrl(scanner)}/${location}`;
};

export const resolveScannerLocation = (
  scanner: DiscoveredScanner,
  location: string,
): Effect.Effect<string, ESCLError> =>
  Effect.gen(function* () {
    const scannerOrigin = yield* getUrlOrigin(getScannerOrigin(scanner));
    const resolvedLocation = getResolvedLocation(scanner, location);
    const locationOrigin = yield* getUrlOrigin(resolvedLocation);

    if (locationOrigin !== scannerOrigin) {
      return yield* Effect.fail(
        new ESCLError({
          message: 'Scanner returned a job URL outside its origin.',
        }),
      );
    }

    return resolvedLocation;
  });

const getUrlOrigin = (value: string): Effect.Effect<string, ESCLError> =>
  Effect.try({
    try: () => new URL(value).origin,
    catch: (cause) =>
      new ESCLError({
        message: 'Scanner returned an invalid job URL.',
        cause,
      }),
  });
