import Bonjour, { type Service } from 'bonjour-service';
import { Effect, Layer } from 'effect';
import { serviceToScanner } from './scanner-discovery-mappers';
import type { ScannerDiscoveryService as ScannerDiscoveryServiceContract } from './scanner-discovery-types';
import {
  ScannerDiscoveryError,
  ScannerDiscoveryService as ScannerDiscoveryServiceTag,
} from './scanner-discovery-types';

export {
  type DiscoveredScanner,
  ScannerDiscoveryError,
  ScannerDiscoveryService,
  type ScannerProtocol,
} from './scanner-discovery-types';

const createMdnsDiscoveryService = (): ScannerDiscoveryServiceContract => ({
  discover: (timeoutMs = 10000) =>
    Effect.tryPromise({
      try: async () => {
        const scanners = new Map<string, ReturnType<typeof serviceToScanner>>();
        const bonjour = new Bonjour();

        const addScanner = (scanner: ReturnType<typeof serviceToScanner>) => {
          const dedupeKey = scanner.uuid || scanner.host;
          const existing = scanners.get(dedupeKey);
          if (!existing || scanner.protocol === 'https') {
            scanners.set(dedupeKey, scanner);
          }
        };

        return new Promise<readonly ReturnType<typeof serviceToScanner>[]>(
          (resolve) => {
            let resolved = false;
            let earlyFinishTimer: NodeJS.Timeout | null = null;
            const EARLY_FINISH_DELAY = 1500;

            const finishDiscovery = () => {
              if (resolved) return;
              resolved = true;
              if (earlyFinishTimer) clearTimeout(earlyFinishTimer);
              clearInterval(refreshInterval);
              httpBrowser.stop();
              httpsBrowser.stop();
              bonjour.destroy();
              resolve(Array.from(scanners.values()));
            };

            const scheduleEarlyFinish = () => {
              if (!earlyFinishTimer && scanners.size > 0) {
                earlyFinishTimer = setTimeout(
                  finishDiscovery,
                  EARLY_FINISH_DELAY,
                );
              }
            };

            const httpBrowser = bonjour.find({ type: 'uscan' });
            httpBrowser.on('up', (service: Service) => {
              addScanner(serviceToScanner(service, 'http'));
              scheduleEarlyFinish();
            });

            const httpsBrowser = bonjour.find({ type: 'uscans' });
            httpsBrowser.on('up', (service: Service) => {
              addScanner(serviceToScanner(service, 'https'));
              scheduleEarlyFinish();
            });

            const refreshInterval = setInterval(() => {
              try {
                httpBrowser.update();
                httpsBrowser.update();
              } catch {
                return;
              }
            }, 500);

            setTimeout(finishDiscovery, timeoutMs);
          },
        );
      },
      catch: (error) =>
        new ScannerDiscoveryError({
          message: 'Failed to discover scanners via mDNS',
          cause: error,
        }),
    }),
});

export const MdnsDiscoveryLayer: Layer.Layer<
  ScannerDiscoveryServiceContract,
  never,
  never
> = Layer.succeed(ScannerDiscoveryServiceTag, createMdnsDiscoveryService());
