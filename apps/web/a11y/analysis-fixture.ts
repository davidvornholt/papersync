// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';

/** Answers scan analysis requests in the browser with a finished result. */
export const mockAnalysis = async (page: Page, analysis: () => unknown) => {
  await page.route('**/api/scans', (route) =>
    route.fulfill({ status: 202, json: { id: 'browser-fixture' } }),
  );
  await page.route('**/api/scans/browser-fixture?wait', (route) =>
    route.fulfill({ json: { status: 'complete', analysis: analysis() } }),
  );
};
