import { expect, it } from 'bun:test';
import { discoverScanners, getScannerCapabilities } from '../discover';
import { scanFromDevice } from '../scan-from-device';

const scanner = {
  id: 'http://127.0.0.1:80/eSCL',
  name: 'Test scanner',
  host: '127.0.0.1',
  port: 80,
  protocol: 'http' as const,
  resourcePath: '/eSCL',
  capabilities: {
    colorModes: ['color'],
    documentFormats: ['image/jpeg'],
  },
};
const outsideRequestScope = /headers.*outside a request scope/u;

it('rejects scanner actions outside a request scope before network work', async () => {
  await expect(discoverScanners(1)).rejects.toThrow(outsideRequestScope);
  await expect(getScannerCapabilities(scanner)).rejects.toThrow(
    outsideRequestScope,
  );
  await expect(
    scanFromDevice(scanner, {
      colorMode: 'color',
      resolution: 300,
      format: 'jpeg',
      inputSource: 'Platen',
    }),
  ).rejects.toThrow(outsideRequestScope);
});
