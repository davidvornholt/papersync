import { createServer } from 'node:http';
import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { Effect, Schema } from 'effect';
import { defaultSettings } from '../src/shared/hooks/use-settings-schema';
import { encodeQRPayload } from '../src/shared/planner/qr';
import { WeekId } from '../src/shared/types/schemas';
import { createSessionCookies } from './auth-fixture';

const entry = {
  day: 'Monday',
  subject: 'Math',
  content: 'Exercises 1–3',
  isTask: true,
  dueDate: '2026-01-02',
};
let modelResponse = JSON.stringify({
  weekId: '2026-W01',
  entries: [entry],
  confidence: 1,
});
let endpoint = '';
const server = createServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ response: modelResponse }));
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
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('an older sheet retains its week and supports review, empty scans, and extraction errors', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.addInitScript(
    (settings) =>
      localStorage.setItem('papersync-settings', JSON.stringify(settings)),
    {
      ...defaultSettings,
      ai: { provider: 'ollama', ollamaEndpoint: endpoint },
    },
  );
  const week = Schema.decodeUnknownSync(WeekId)('2026-W01');
  const qr = await Effect.runPromise(encodeQRPayload(week));
  await page.goto('/scan');
  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'older-sheet.png',
    mimeType: 'image/png',
    buffer: Buffer.from(qr.split(',')[1], 'base64'),
  });
  await expect(page.getByText(`Sheet week: ${week}`)).toBeVisible();
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(page.getByLabel('Homework or note')).toHaveValue(entry.content);
  await expect(page.getByLabel('Due date')).toHaveValue(entry.dueDate);
  await page.getByLabel('Due date').fill('2026-01-05');
  await expect(page.getByLabel('Due date')).toHaveValue('2026-01-05');
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  modelResponse = JSON.stringify({
    weekId: '2026-W01',
    entries: [],
    confidence: 1,
  });
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(page.getByText('No new entries detected')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Approve and save' }),
  ).toHaveCount(0);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  modelResponse = 'invalid model output';
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(
    page.getByText('Processing failed', { exact: true }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});

test('a sheet without a QR code uses OCR for its week and only asks for unreadable weeks', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.addInitScript(
    (settings) =>
      localStorage.setItem('papersync-settings', JSON.stringify(settings)),
    {
      ...defaultSettings,
      ai: { provider: 'ollama', ollamaEndpoint: endpoint },
    },
  );
  modelResponse = JSON.stringify({
    weekId: '2026-W01',
    entries: [entry],
    confidence: 1,
  });
  await page.goto('/scan');
  const imageData = await page.evaluate(() => {
    const width = 500;
    const height = 300;
    const textLeft = 24;
    const headingTop = 48;
    const entryTop = 100;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const drawing = canvas.getContext('2d');
    if (drawing) {
      drawing.fillStyle = 'white';
      drawing.fillRect(0, 0, canvas.width, canvas.height);
      drawing.fillStyle = 'black';
      drawing.font = '24px sans-serif';
      drawing.fillText('2026-W01 — Monday', textLeft, headingTop);
      drawing.fillText('Math: Exercises 1–3', textLeft, entryTop);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const imageBuffer = Buffer.from(imageData, 'base64');

  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'no-qr.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });
  const process = page.getByRole('button', { name: 'Process scan' });
  await expect(process).toBeEnabled();
  await process.click();
  await expect(page.getByText('Sheet week: 2026-W01')).toBeVisible();
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await expect(approve).toBeEnabled();
  await page.getByLabel('Entry type').selectOption('note');
  await expect(approve).toBeDisabled();
  await expect(
    page.getByText('Notes are shown for review', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Entry type').selectOption('task');
  const completed = page.getByLabel('Completed on paper');
  await completed.focus();
  await page.keyboard.press('Space');
  await expect(completed).toBeChecked();
  expect(await scanWcag22AaViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Change image' }).click();
  modelResponse = JSON.stringify({
    weekId: null,
    entries: [{ ...entry, dueDate: null }],
    confidence: 1,
  });
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'unreadable-week.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });
  await process.click();
  await expect(approve).toBeDisabled();
  const weekInput = page.getByLabel('Week printed on the sheet');
  await expect(weekInput).toBeVisible();
  await weekInput.focus();
  // Native week inputs emit a change for the partial year while typing.
  await page.keyboard.type('01');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');
  await expect(weekInput).toHaveValue('0002-W01');
  await expect(page.getByText('Sheet week: 0002-W01')).toBeVisible();
  await expect(
    page.locator('details').filter({ has: weekInput }),
  ).toHaveAttribute('open', '');
  await expect(weekInput).toBeFocused();
  await page.keyboard.type('026');
  await expect(weekInput).toHaveValue('2026-W01');
  await expect(weekInput).toBeFocused();
  modelResponse = JSON.stringify({
    weekId: '2026-W01',
    entries: [entry],
    confidence: 1,
  });
  await process.click();
  await expect(approve).toBeEnabled();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await expect(
    page.getByRole('button', { name: 'Dismiss', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath('review.png'),
    fullPage: true,
  });
});
