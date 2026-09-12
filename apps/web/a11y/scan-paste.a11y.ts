import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { Effect, Schema } from 'effect';
import { encodeQRPayload } from '../src/shared/planner/qr';
import { WeekId } from '../src/shared/types/schemas';
import { createSessionCookies } from './auth-fixture';

const pngDataUrlPattern = /^data:image\/png;base64,/u;

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

test('Ctrl+V previews a clipboard image and reads its printed week', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/scan');
  await expect(
    page.getByRole('button', { name: 'Upload image' }),
  ).toBeEnabled();
  const week = Schema.decodeUnknownSync(WeekId)('2026-W01');
  const qr = await Effect.runPromise(encodeQRPayload(week));
  await page.evaluate(async (data) => {
    const blob = await (await fetch(data)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }, qr);
  await page.keyboard.press('Control+V');
  await expect(page.getByAltText('Scanned planner preview')).toHaveAttribute(
    'src',
    pngDataUrlPattern,
  );
  await expect(page.getByLabel('Week printed on the sheet')).toHaveValue(week);
  await expect(
    page.getByRole('button', { name: 'Process scan' }),
  ).toBeEnabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});

test('image paste preserves editing, respects processing, and validates uploads', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  await expect(
    page.getByRole('button', { name: 'Upload image' }),
  ).toBeEnabled();
  const week = Schema.decodeUnknownSync(WeekId)('2026-W01');
  const nextWeek = Schema.decodeUnknownSync(WeekId)('2026-W02');
  const qr = await Effect.runPromise(encodeQRPayload(week));
  const nextQr = await Effect.runPromise(encodeQRPayload(nextWeek));
  expect(await pasteImage(page, qr)).toBe(true);
  const preview = page.getByAltText('Scanned planner preview');
  await expect(preview).toHaveAttribute('src', qr);
  const weekInput = page.getByLabel('Week printed on the sheet');
  await expect(weekInput).toHaveValue(week);
  expect(await pasteImage(page, nextQr, 'input[type=week]')).toBe(false);
  await expect(preview).toHaveAttribute('src', qr);
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
  await expect(preview).toHaveAttribute('src', qr);

  const { promise: responseReady, resolve: releaseResponse } =
    Promise.withResolvers<void>();
  await page.route('**/scan', async (route) => {
    if (!route.request().headers()['next-action']) {
      await route.continue();
      return;
    }
    await responseReady;
    await route.fulfill({
      contentType: 'text/x-component',
      body: '0:{"a":"$@1","f":"","b":"test"}\n1:{"success":false,"error":"Test extraction stopped."}\n',
    });
  });
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(
    page.getByRole('button', { name: 'Analyzing...' }),
  ).toBeDisabled();
  expect(await pasteImage(page, nextQr)).toBe(false);
  await expect(preview).toHaveAttribute('src', qr);
  releaseResponse();
  await expect(
    page.getByText('Processing failed', { exact: true }),
  ).toBeVisible();
  expect(await pasteImage(page, nextQr)).toBe(true);
  await expect(preview).toHaveAttribute('src', nextQr);
  await expect(weekInput).toHaveValue(nextWeek);

  expect(
    await pasteImage(
      page,
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    ),
  ).toBe(true);
  await expect(
    page.getByText('Choose a JPEG, PNG, or WebP image no larger than 10 MB.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(preview).toHaveCount(0);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});
