// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';
import { test } from './settings-fixture';

// Saving clears every photo of the scan, so a photo whose homework the shown
// analysis did not read must block saving until all photos are analyzed.
const addedPhotoMessage = 'You added photos after this analysis.';

const photo = async (page: Page, name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    (await createPlannerImage(page)).split(',')[1] ?? '',
    'base64',
  ),
});

// Analyses are answered once the test calls the returned function.
const holdAnalyses = async (page: Page) => {
  const analysis = Promise.withResolvers<void>();
  await page.route('**/api/scans', (route) =>
    route.fulfill({ status: 202, json: { id: 'held' } }),
  );
  await page.route('**/api/scans/held?wait', async (route) => {
    await analysis.promise;
    // A request the page abandoned by navigating can no longer be answered.
    await route
      .fulfill({
        json: {
          status: 'complete',
          analysis: {
            modelUsed: 'browser fixture',
            data: {
              weekId: '2026-W01',
              confidence: 1,
              entries: [
                {
                  day: 'Monday',
                  subject: 'Math',
                  content: 'Exercises 1–3',
                  action: 'add',
                },
              ],
            },
          },
        },
      })
      .catch(() => undefined);
  });
  return analysis.resolve;
};

const storedJobId = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const opening = indexedDB.open('papersync');
        opening.onsuccess = () => {
          const reading = opening.result
            .transaction('scan-draft')
            .objectStore('scan-draft')
            .get('review');
          reading.onsuccess = () => {
            resolve((reading.result as { jobId?: unknown } | undefined)?.jobId);
            opening.result.close();
          };
        };
      }),
  );

test.beforeEach(async ({ context }) => {
  await context.addCookies(await createSessionCookies());
});

test('a photo still being prepared blocks saving', async ({ page }) => {
  // Preparing a photo waits until the test lets it finish.
  await page.addInitScript(() => {
    const decode = globalThis.createImageBitmap.bind(globalThis);
    const held = globalThis as unknown as {
      preparation?: Promise<void>;
    };
    const delayed = async (
      image: ImageBitmapSource,
      options?: ImageBitmapOptions,
    ) => {
      await held.preparation;
      return decode(image, options);
    };
    Object.assign(globalThis, { createImageBitmap: delayed });
  });
  const finish = await holdAnalyses(page);
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles(await photo(page, 'front.png'));
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  finish();
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await expect(approve).toBeEnabled();

  await page.evaluate(() => {
    const gate = Promise.withResolvers<void>();
    Object.assign(globalThis, {
      preparation: gate.promise,
      finishPreparation: gate.resolve,
    });
  });
  await picker.setInputFiles(await photo(page, 'back.png'));
  await expect(page.getByText('Preparing photos…')).toBeVisible();
  await expect(approve).toBeDisabled();
  await page.evaluate(() =>
    (
      globalThis as unknown as { finishPreparation: () => void }
    ).finishPreparation(),
  );
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await expect(approve).toBeDisabled();
});

test('a photo shared during the analysis is analyzed before saving', async ({
  page,
}) => {
  const finish = await holdAnalyses(page);
  await page.goto('/scan');
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles(await photo(page, 'front.png'));
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  await expect(page.getByText('Analyzing handwriting…')).toBeVisible();
  await expect.poll(() => storedJobId(page)).toBe('held');

  // The back of the sheet is shared to PaperSync while the front is read.
  // Android shares by navigating to the manifest's share target with a form.
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'share';
    form.method = 'post';
    form.action = '/share-target';
    form.enctype = 'multipart/form-data';
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'page';
    input.setAttribute('aria-label', 'Shared photos');
    form.append(input);
    document.body.append(form);
  });
  await page
    .getByLabel('Shared photos')
    .setInputFiles(await photo(page, 'back.png'));
  await page
    .locator('form#share')
    .evaluate((form) => (form as HTMLFormElement).submit());
  await expect(page.getByText('Added the shared photo.')).toBeVisible();
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);

  finish();
  await expect(page.getByLabel('Task')).toHaveValue('Exercises 1–3');
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await expect(page.getByText(addedPhotoMessage)).toBeVisible();
  await expect(approve).toBeDisabled();
  await page.reload();
  await expect(page.getByText(addedPhotoMessage)).toBeVisible();
  await expect(approve).toBeDisabled();

  await page.getByRole('button', { name: 'Analyze 2 photos again' }).click();
  await expect(page.getByText(addedPhotoMessage)).toHaveCount(0);
  await expect(approve).toBeEnabled();
});

test('a photo scanned while saving stays in the scan', async ({ page }) => {
  const finish = await holdAnalyses(page);
  finish();
  const scanned = Promise.withResolvers<void>();
  const saved = Promise.withResolvers<void>();
  const scannedImage = await page
    .goto('/scan')
    .then(() => createPlannerImage(page, '2026-W02'));
  // Discovery, the scanner and saving are Server Actions posted to this page.
  // Each is told apart by its arguments, so no real scanner is needed.
  await page.route('**/scan', async (route) => {
    const body = route.request().postData() ?? '';
    if (!route.request().headers()['next-action']) {
      return route.continue();
    }
    let result: unknown = {
      success: true,
      scanners: [
        {
          id: 'fixture',
          name: 'Fixture scanner',
          host: '192.0.2.1',
          port: 80,
          protocol: 'http',
          resourcePath: '/eSCL',
          capabilities: { colorModes: ['color'], documentFormats: [] },
        },
      ],
    };
    if (body.includes('"colorMode"')) {
      await scanned.promise;
      result = { success: true, imageData: scannedImage };
    } else if (body.includes('"resourcePath"')) {
      const source = {
        resolutions: [300],
        colorModes: ['color'],
        maxWidth: 2550,
        maxHeight: 3300,
      };
      result = {
        success: true,
        capabilities: {
          inputSources: ['Platen'],
          sourceCapabilities: Object.fromEntries(
            ['Platen', 'Adf'].map((name) => [name, source]),
          ),
          formats: ['image/jpeg'],
          maxWidth: 2550,
          maxHeight: 3300,
          minWidth: 1,
          minHeight: 1,
        },
      };
    } else if (body.includes('"subject"')) {
      await saved.promise;
      result = { success: true, count: 1 };
    }
    return route
      .fulfill({
        contentType: 'text/x-component',
        body: `0:{"a":"$@1","f":"","b":"test"}\n1:${JSON.stringify(result)}\n`,
      })
      .catch(() => undefined);
  });

  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles(await photo(page, 'front.png'));
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await expect(approve).toBeEnabled();

  // The back of the sheet is on the network scanner when saving starts.
  await page.getByText('Use a network scanner', { exact: true }).click();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.getByRole('button', { name: 'Fixture scanner' }).click();
  await page.getByRole('button', { name: 'Scan document' }).click();
  await approve.click();
  scanned.resolve();
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  saved.resolve();

  await expect(
    page.getByText('1 tasks waiting for Super Productivity'),
  ).toBeVisible();
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  await expect(approve).toHaveCount(0);
  await page.reload();
  await expect(pages.getByRole('listitem')).toHaveCount(1);
});
