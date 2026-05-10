import type { DiscoveredScanner } from './scanner-discovery-types';

const formatHostForUrl = (host: string): string =>
  host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;

export const getScannerOrigin = (scanner: DiscoveredScanner): string =>
  `${scanner.protocol}://${formatHostForUrl(scanner.host)}:${scanner.port}`;

export const getScannerResourceBaseUrl = (scanner: DiscoveredScanner): string =>
  `${getScannerOrigin(scanner)}${scanner.resourcePath}`;

export const resolveScannerLocation = (
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
