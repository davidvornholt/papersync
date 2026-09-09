// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { Suspense } from 'react';
import { ScanScreen } from '@/features/scanner/screens/scan-screen';

const ScanPage = (): React.ReactElement => (
  <Suspense fallback={<p role="status">Opening scan…</p>}>
    <ScanScreen />
  </Suspense>
);

export default ScanPage;
