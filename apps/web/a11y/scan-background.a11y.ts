import { createServer } from 'node:http';
import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { defaultSettings } from '../src/shared/settings/schema';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';
import { test } from './settings-fixture';

const entry = {
  day: 'Monday',
  subject: 'Math',
  content: 'Exercises 1–3',
  dueDate: '2026-01-02',
};
const modelResponse = JSON.stringify({
  weekId: '2026-W01',
  entries: [entry],
  confidence: 1,
});
let endpoint = '';
let modelHeld = Promise.withResolvers<void>();
const modelRequests: Array<{ readonly images: ReadonlyArray<string> }> = [];
const server = createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', async () => {
    modelRequests.push(JSON.parse(body));
    await modelHeld.promise;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ response: modelResponse }));
  });
});
test.beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address && typeof address === 'object') {
    endpoint = `http://127.0.0.1:${address.port}`;
  }
  expect(endpoint).not.toBe('');
});
test.beforeEach(async ({ context }) => {
  modelHeld = Promise.withResolvers<void>();
  modelRequests.length = 0;
  await context.addCookies(await createSessionCookies());
  await context.addInitScript(
    (settings) =>
      localStorage.setItem('papersync-settings', JSON.stringify(settings)),
    {
      ...defaultSettings,
      ai: { provider: 'ollama', ollamaEndpoint: endpoint },
    },
  );
});
test.afterEach(() => modelHeld.resolve());
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const imageFile = async (page: Page, name: string, week = '2026-W01') => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    (await createPlannerImage(page, week)).split(',')[1] ?? '',
    'base64',
  ),
});

test('front and back are analyzed together and survive leaving the page', async ({
  page,
}) => {
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([
    await imageFile(page, 'front.png'),
    await imageFile(page, 'back.png'),
  ]);
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Analyze 2 photos' }).click();
  await expect(page.getByText('Analyzing handwriting…')).toBeVisible();
  await expect.poll(() => modelRequests.length).toBe(1);
  expect(modelRequests[0]?.images).toHaveLength(2);

  // The phone discards the tab while the server keeps analyzing.
  await page.reload();
  await expect(page.getByText('Analyzing handwriting…')).toBeVisible();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  modelHeld.resolve();
  const task = page.getByLabel('Task');
  await expect(task).toHaveValue(entry.content);
  expect(modelRequests).toHaveLength(1);

  await task.fill('Exercises 1–4');
  await page.reload();
  await expect(page.getByLabel('Task')).toHaveValue('Exercises 1–4');
  await expect(page.getByText('Sheet week: 2026-W01')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Approve and save' }),
  ).toBeEnabled();

  await page.getByRole('button', { name: 'View page 2' }).click();
  const viewer = page.getByRole('dialog', { name: 'Page 2' });
  await expect(
    viewer.getByAltText('Page 2 of the sheet, full size'),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Remove page 1' }).click();
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Start over' }).click();
  // Observe the reset render before navigation can discard its state update.
  await expect(pages.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByLabel('Task')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible();
  await expect(page.getByLabel('Task')).toHaveCount(0);
});

test('cancelling stops the analysis on the server', async ({ page }) => {
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([await imageFile(page, 'sheet.png')]);
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  const cancel = page.getByRole('button', { name: 'Cancel analysis' });
  await expect(page.getByText('Analyzing handwriting…')).toBeVisible();
  const cancelled = page.waitForRequest(
    (request) =>
      request.method() === 'DELETE' && request.url().includes('/api/scans/'),
  );
  await cancel.click();
  await cancelled;
  await expect(
    page.getByText('Add photos of the sheet to see its homework'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Add photos of the sheet to see its homework'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Analyze photo', exact: true }),
  ).toBeEnabled();
});

// Longer than the two seconds Scan waits before it unlocks without the draft.
const slowStoreMilliseconds = 2500;
const preparationDelayMilliseconds = 1000;
// Each read of the stored draft waits for the slow store as well.
const slowStoreTimeout = 10_000;
const camera = { width: 4000, height: 3000, fontSize: 160, margin: 200 };
const reduced = { width: 2048, height: 1536 };

const cameraPhoto = async (page: Page, name: string) => {
  const large = await page.evaluate(({ width, height, fontSize, margin }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const drawing = canvas.getContext('2d');
    if (drawing) {
      drawing.fillStyle = 'white';
      drawing.fillRect(0, 0, width, height);
      drawing.fillStyle = 'black';
      drawing.font = `${fontSize}px sans-serif`;
      drawing.fillText('2026-W01 — Monday', margin, margin + fontSize);
    }
    return canvas.toDataURL('image/png');
  }, camera);
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(large.split(',')[1] ?? '', 'base64'),
  };
};

type StoredPage = { type: string; width: number; height: number };
const readStoredPages = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Array<StoredPage>>((resolve, reject) => {
        const open = indexedDB.open('papersync');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result
            .transaction('scan-draft')
            .objectStore('scan-draft')
            .get('pages');
          request.onsuccess = async () => {
            const stored = (request.result ?? []) as Array<{ image: Blob }>;
            const pages = await Promise.all(
              stored.map(async ({ image }) => {
                const bitmap = await createImageBitmap(image);
                return {
                  type: image.type,
                  width: bitmap.width,
                  height: bitmap.height,
                };
              }),
            );
            open.result.close();
            resolve(pages);
          };
        };
      }),
  );

test('large photos are reduced before upload', async ({ page }) => {
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles(await cameraPhoto(page, 'camera.png'));
  await expect(page.getByAltText('Page 1 of the sheet')).toBeVisible();
  const [stored] = await readStoredPages(page);
  expect(stored).toEqual({ type: 'image/jpeg', ...reduced });
});

const goTo = async (page: Page, name: string, path: string) => {
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(path);
};

test('leaving Scan during the upload resumes the analysis on return', async ({
  page,
}) => {
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([await imageFile(page, 'sheet.png')]);
  const upload = Promise.withResolvers<void>();
  await page.route('**/api/scans', async (route) => {
    await upload.promise;
    await route.continue();
  });
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  await expect(page.getByText('Uploading photos…')).toBeVisible();
  await goTo(page, 'Settings', '/settings');
  upload.resolve();
  await expect.poll(() => modelRequests.length).toBe(1);
  modelHeld.resolve();
  await goTo(page, 'Scan', '/scan');
  await expect(page.getByLabel('Task')).toHaveValue(entry.content);
});

test('photos picked just before leaving Scan are kept', async ({
  page,
  context,
}) => {
  // Preparing photos takes a moment on a phone; leave Scan during it.
  await context.addInitScript((delay) => {
    const decode = globalThis.createImageBitmap.bind(globalThis);
    const delayed = (image: ImageBitmapSource, options?: ImageBitmapOptions) =>
      new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => decode(image, options))
        .finally(() => {
          document.documentElement.dataset.decodedPhotos = String(
            Number(document.documentElement.dataset.decodedPhotos ?? 0) + 1,
          );
        });
    Object.assign(globalThis, { createImageBitmap: delayed });
  }, preparationDelayMilliseconds);
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([
    await cameraPhoto(page, 'front.png'),
    await cameraPhoto(page, 'back.png'),
  ]);
  await expect(page.getByText('Preparing photos…')).toBeVisible();
  await goTo(page, 'Settings', '/settings');
  // Both photos finish preparing while Scan is hidden.
  await expect(page.locator('html')).toHaveAttribute(
    'data-decoded-photos',
    '2',
  );
  await goTo(page, 'Scan', '/scan');
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await page.reload();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
});

test('a slow browser store does not lose the scan', async ({
  page,
  context,
}) => {
  await context.addInitScript((delay) => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (name, version) => {
      const request = open(name, version);
      let onSuccess: IDBOpenDBRequest['onsuccess'] = null;
      Object.defineProperty(request, 'onsuccess', {
        configurable: true,
        get: () => onSuccess,
        set: (handler: IDBOpenDBRequest['onsuccess']) => {
          onSuccess = handler;
        },
      });
      request.addEventListener('success', (event) => {
        setTimeout(() => onSuccess?.call(request, event), delay);
      });
      return request;
    };
  }, slowStoreMilliseconds);
  await page.goto('/scan');
  const picker = page.getByLabel('Select images from device');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles([await imageFile(page, 'sheet.png')]);
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  await expect
    .poll(async () => (await readStoredPages(page)).length, {
      timeout: slowStoreTimeout,
    })
    .toBe(1);
  await page.reload();
  await expect(pages.getByRole('listitem')).toHaveCount(1, {
    timeout: slowStoreTimeout,
  });
});
