import { scanWcag22AaViolations as scanNow } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';

/**
 * Enter animations fade content in; axe must not sample colour contrast
 * mid-fade. Wait for every finite animation to finish, then scan.
 */
export const scanWcag22AaViolations = async (
  page: Page,
): ReturnType<typeof scanNow> => {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState === 'finished' ||
          animation.playState === 'idle' ||
          animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
      ),
  );
  return scanNow(page);
};
