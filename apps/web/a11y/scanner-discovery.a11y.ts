import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';

const discoveryStatusPattern = /scanner|network/iu;

test('scanner discovery explains its network and distinguishes empty results from failures', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  await page.getByText('Use a network scanner', { exact: true }).click();
  const status = page
    .getByRole('status')
    .filter({ hasText: discoveryStatusPattern });
  const discover = page.getByRole('button', { name: 'Discover', exact: true });
  await expect(status).toHaveText(
    'Discover scanners on the network where PaperSync is running.',
  );

  const { promise: responseReady, resolve: releaseResponse } =
    Promise.withResolvers<void>();
  let outcome: 'empty' | 'error' | 'connection' = 'empty';
  await page.route('**/scan', async (route) => {
    if (!route.request().headers()['next-action']) {
      await route.continue();
      return;
    }
    await responseReady;
    if (outcome === 'connection') {
      await route.abort('failed');
      return;
    }
    const result =
      outcome === 'empty'
        ? { success: true, scanners: [] }
        : { success: false, error: 'Discovery unavailable in this test.' };
    // Exercise the client with Server Action responses without depending on
    // real scanners or multicast availability on the test runner's network.
    await route.fulfill({
      contentType: 'text/x-component',
      body: `0:{"a":"$@1","f":"","b":"test"}\n1:${JSON.stringify(result)}\n`,
    });
  });

  await discover.click();
  await expect(status).toHaveText(
    'Searching the network where PaperSync is running…',
  );
  await expect(
    page.getByRole('button', { name: 'Searching...' }),
  ).toBeDisabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  releaseResponse();
  await expect(status).toContainText(
    'No scanners found on PaperSync’s network.',
  );
  await expect(status).toContainText('save a scan as JPEG or PNG');
  await expect(discover).toBeEnabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);

  outcome = 'error';
  await discover.click();
  await expect(status).toHaveText('Scanner discovery failed. Try again.');
  await expect(discover).toBeEnabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);

  outcome = 'connection';
  await discover.click();
  await expect(status).toHaveText('Scanner discovery failed. Try again.');
  await expect(discover).toBeEnabled();

  outcome = 'empty';
  await discover.click();
  await expect(status).toContainText(
    'No scanners found on PaperSync’s network.',
  );
  await expect(discover).toBeEnabled();
});
