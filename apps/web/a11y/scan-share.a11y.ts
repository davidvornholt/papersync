import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';
import { test } from './settings-fixture';

const seeOther = 303;

const photo = async (page: Page, name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    (await createPlannerImage(page)).split(',')[1] ?? '',
    'base64',
  ),
});

const waitForWorker = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);

test.beforeEach(async ({ context }) => {
  await context.addCookies(await createSessionCookies());
});

test('photos shared to PaperSync become pages of the scan', async ({
  page,
}) => {
  await page.goto('/scan');
  await waitForWorker(page);
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
    input.multiple = true;
    input.setAttribute('aria-label', 'Shared photos');
    form.append(input);
    document.body.append(form);
  });
  await page
    .getByLabel('Shared photos')
    .setInputFiles([
      await photo(page, 'front.png'),
      await photo(page, 'back.png'),
    ]);
  await page
    .locator('form#share')
    .evaluate((form) => (form as HTMLFormElement).submit());
  await expect(page).toHaveURL('/scan');
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('Added 2 shared photos.')).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.reload();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
});

test('a share that reaches the server asks for the photos again', async ({
  page,
  request,
}) => {
  const response = await request.post('/share-target', {
    multipart: { page: await photo(page, 'sheet.png') },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(seeOther);
  expect(new URL(response.headers().location ?? '').pathname).toBe('/scan');
  await page.goto('/scan?shared=failed');
  await expect(
    page.getByText(
      'PaperSync could not receive the shared photos. Share them again.',
    ),
  ).toBeVisible();
  await expect(page).toHaveURL('/scan');
});

// Headless Chromium denies notifications even when granted, so these tests
// stand in for the browser's permission and system notification.
const stubNotifications = (page: Page, permission: NotificationPermission) =>
  page.addInitScript((initial) => {
    let current = initial;
    const shown: Array<{ title: string; body?: string }> = [];
    Object.assign(globalThis, { shownNotifications: shown });
    Object.defineProperty(Notification, 'permission', { get: () => current });
    Notification.requestPermission = () => {
      current = 'granted';
      return Promise.resolve(current);
    };
    ServiceWorkerRegistration.prototype.showNotification = (title, options) => {
      shown.push({ title, body: options?.body });
      return Promise.resolve();
    };
  }, permission);

const holdAnalysis = async (page: Page) => {
  const analysis = Promise.withResolvers<void>();
  await page.route('**/api/scans', (route) =>
    route.fulfill({ status: 202, json: { id: 'background' } }),
  );
  await page.route('**/api/scans/background?wait', async (route) => {
    await analysis.promise;
    await route.fulfill({
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
    });
  });
  return analysis.resolve;
};

const startAnalysis = async (page: Page) => {
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([await photo(page, 'sheet.png')]);
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
};

const shownNotifications = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { shownNotifications: Array<unknown> })
        .shownNotifications,
  );

test('analysis offers a notification and sends it while PaperSync is away', async ({
  page,
}) => {
  await stubNotifications(page, 'default');
  await page.goto('/scan');
  await waitForWorker(page);
  const finish = await holdAnalysis(page);
  await startAnalysis(page);
  const notify = page.getByRole('button', { name: 'Notify me when it’s done' });
  await expect(notify).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await notify.click();
  await expect(
    page.getByText('PaperSync will notify you if you’re in another app', {
      exact: false,
    }),
  ).toBeVisible();
  // The person switches to another app.
  await page.evaluate(() =>
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    }),
  );
  finish();
  await expect
    .poll(() => shownNotifications(page))
    .toEqual([
      {
        title: 'Homework ready to review',
        body: 'Review 1 new or changed entries',
      },
    ]);
});

test('no notification appears while Scan is on screen', async ({ page }) => {
  await stubNotifications(page, 'granted');
  await page.goto('/scan');
  await waitForWorker(page);
  const finish = await holdAnalysis(page);
  await startAnalysis(page);
  await expect(
    page.getByRole('button', { name: 'Notify me when it’s done' }),
  ).toHaveCount(0);
  finish();
  await expect(page.getByLabel('Task')).toHaveValue('Exercises 1–3');
  expect(await shownNotifications(page)).toEqual([]);
});
