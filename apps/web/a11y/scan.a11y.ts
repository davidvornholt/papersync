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
let modelResponse = JSON.stringify({ entries: [entry], confidence: 1 });
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
  await expect(page.getByLabel('Week printed on the sheet')).toHaveValue(week);
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(page.getByLabel('Homework or note')).toHaveValue(entry.content);
  await expect(page.getByLabel('Due date')).toHaveValue(entry.dueDate);
  await page.getByLabel('Due date').fill('2026-01-05');
  await expect(page.getByLabel('Due date')).toHaveValue('2026-01-05');
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  modelResponse = JSON.stringify({ entries: [], confidence: 1 });
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
