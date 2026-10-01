import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';
import { test } from './settings-fixture';

const blobUrlPattern = /^blob:/u;

const pasteImage = (page: Page, image: string, selector = 'body') =>
  page.evaluate(
    async ({ data, targetSelector }) => {
      const blob = await (await fetch(data)).blob();
      const clipboardData = new DataTransfer();
      clipboardData.items.add(
        new File([blob], 'pasted-image', { type: blob.type }),
      );
      const event = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      });
      document.querySelector(targetSelector)?.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { data: image, targetSelector: selector },
  );

test('Ctrl+V adds a clipboard image as a page to analyze', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/scan');
  await expect(
    page.getByRole('button', { name: 'Upload images' }),
  ).toBeEnabled();
  const week = '2026-W01';
  const image = await createPlannerImage(page, week);
  await page.evaluate(async (data) => {
    const blob = await (await fetch(data)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }, image);
  await page.keyboard.press('Control+V');
  await expect(page.getByAltText('Page 1 of the sheet')).toHaveAttribute(
    'src',
    blobUrlPattern,
  );
  await expect(
    page.getByText('Week detected automatically when analyzing'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Analyze photo', exact: true }),
  ).toBeEnabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});

test('image paste preserves editing, respects processing, and validates images', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  await expect(
    page.getByRole('button', { name: 'Upload images' }),
  ).toBeEnabled();
  const week = '2026-W01';
  const image = await createPlannerImage(page, week);
  const nextImage = await createPlannerImage(page, '2026-W02');
  expect(await pasteImage(page, image)).toBe(true);
  const pages = page.getByRole('list', { name: 'Photos of the sheet' });
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  await page.getByText('Week detected automatically when analyzing').click();
  const weekInput = page.getByLabel('Week printed on the sheet');
  await weekInput.fill(week);
  await expect(weekInput).toHaveValue(week);
  expect(await pasteImage(page, nextImage, 'input[type=week]')).toBe(false);
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  await expect(weekInput).toHaveValue(week);

  const textPastePrevented = await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Homework notes');
    const event = new ClipboardEvent('paste', {
      clipboardData,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(textPastePrevented).toBe(false);
  await expect(pages.getByRole('listitem')).toHaveCount(1);

  const { promise: uploadHeld, resolve: releaseUpload } =
    Promise.withResolvers<void>();
  await page.route('**/api/scans', async (route) => {
    await uploadHeld;
    await route.fulfill({ status: 202, json: { id: 'stopped' } });
  });
  await page.route('**/api/scans/stopped?wait', (route) =>
    route.fulfill({
      json: { status: 'failed', error: 'Test extraction stopped.' },
    }),
  );
  await page
    .getByRole('button', { name: 'Analyze photo', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
  await expect(page.getByText('Uploading photos…')).toBeVisible();
  expect(await pasteImage(page, nextImage)).toBe(false);
  await expect(pages.getByRole('listitem')).toHaveCount(1);
  releaseUpload();
  await expect(
    page.getByText('Processing failed', { exact: true }),
  ).toBeVisible();
  expect(await pasteImage(page, nextImage)).toBe(true);
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await expect(weekInput).toHaveValue(week);

  expect(
    await pasteImage(
      page,
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    ),
  ).toBe(true);
  await expect(
    page.getByText('Choose a JPEG, PNG, or WebP image no larger than 40 MB.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});
