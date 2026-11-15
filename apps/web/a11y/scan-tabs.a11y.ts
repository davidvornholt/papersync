import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';
import { test } from './settings-fixture';

const addPhotos = async (page: Page, names: ReadonlyArray<string>) => {
  const buffer = Buffer.from(
    (await createPlannerImage(page)).split(',')[1] ?? '',
    'base64',
  );
  await page
    .getByLabel('Select images from device')
    .setInputFiles(
      names.map((name) => ({ name, mimeType: 'image/png', buffer })),
    );
};
// Reads how many photos the browser keeps for the next visit.
const storedPhotoCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('papersync');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result
            .transaction('scan-draft')
            .objectStore('scan-draft')
            .get('pages');
          request.onsuccess = () => {
            resolve(Array.isArray(request.result) ? request.result.length : 0);
            open.result.close();
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
const photos = (page: Page) =>
  page.getByRole('list', { name: 'Photos of the sheet' }).getByRole('listitem');

test('a second tab cannot overwrite photos the first tab added', async ({
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  const first = await context.newPage();
  const second = await context.newPage();
  for (const tab of [first, second]) {
    await tab.goto('/scan');
    await expect(tab.getByLabel('Select images from device')).toBeEnabled();
  }

  await addPhotos(first, ['front.png', 'back.png']);
  await expect(photos(first)).toHaveCount(2);
  await expect.poll(() => storedPhotoCount(first)).toBe(2);
  await addPhotos(second, ['other.png']);
  await expect(photos(second)).toHaveCount(1);
  await expect(
    second.getByText('This scan was changed in another tab or window'),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(second)).toEqual([]);
  expect(await storedPhotoCount(second)).toBe(2);

  // The first tab's photos are kept, and reloading the second tab restores
  // them without making the first tab stale.
  await second.reload();
  await expect(photos(second)).toHaveCount(2);
  await addPhotos(first, ['last.png']);
  await expect(photos(first)).toHaveCount(3);
  await first.reload();
  await expect(photos(first)).toHaveCount(3);
});
