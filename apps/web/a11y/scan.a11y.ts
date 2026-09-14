import { createServer } from 'node:http';
import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { defaultSettings } from '../src/shared/hooks/use-settings-schema';
import { createSessionCookies } from './auth-fixture';
import { createPlannerImage } from './planner-image';

const entry = {
  day: 'Monday',
  subject: 'Math',
  content: 'Exercises 1–3',
  dueDate: '2026-01-02',
};
let modelResponse = JSON.stringify({
  weekId: '2026-W01',
  entries: [entry],
  confidence: 1,
});
let endpoint = '';
let modelRequests = 0;
const server = createServer((_request, response) => {
  modelRequests += 1;
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
  const week = '2026-W01';
  const image = await createPlannerImage(page, week);
  await page.goto('/scan');
  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'older-sheet.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image.split(',')[1], 'base64'),
  });
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(page.getByText(`Sheet week: ${week}`)).toBeVisible();
  await expect(page.getByLabel('Task')).toHaveValue(entry.content);
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

test('a sheet uses OCR for its week and only asks for unreadable weeks', async ({
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
  const [, imageData] = (await createPlannerImage(page)).split(',');
  const imageBuffer = Buffer.from(imageData, 'base64');

  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'printed-week.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });
  const process = page.getByRole('button', { name: 'Process scan' });
  await expect(process).toBeEnabled();
  await process.click();
  await expect(page.getByText('Sheet week: 2026-W01')).toBeVisible();
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await expect(approve).toBeEnabled();
  await expect(page.getByLabel('Entry type')).toHaveCount(0);
  await expect(page.getByLabel('Completed on paper')).toHaveCount(0);
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
  const requestsBeforeCorrection = modelRequests;
  const homework = page.getByLabel('Task');
  await homework.fill('Exercises 1–4, corrected');
  await page.getByLabel('Due date').fill('2026-01-06');
  const weekInput = page.getByLabel('Week printed on the sheet');
  await expect(weekInput).toBeVisible();
  await weekInput.focus();
  // Native week inputs emit a change for the partial year while typing.
  await page.keyboard.type('01');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');
  await expect(weekInput).toHaveValue('0002-W01');
  await expect(homework).toHaveValue('Exercises 1–4, corrected');
  await expect(approve).toBeDisabled();
  await expect(page.getByText('Sheet week: 0002-W01')).toBeVisible();
  await expect(
    page.locator('details').filter({ has: weekInput }),
  ).toHaveAttribute('open', '');
  await expect(weekInput).toBeFocused();
  await page.keyboard.type('026');
  await expect(weekInput).toHaveValue('2026-W01');
  await expect(weekInput).toBeFocused();
  await expect(approve).toBeDisabled();
  await page.route('**/scan', (route) => route.abort(), { times: 1 });
  await page
    .getByRole('button', { name: 'Use this week', exact: true })
    .click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'PaperSync could not complete' }),
  ).toContainText('PaperSync could not complete the request');
  await page
    .getByRole('alert')
    .filter({ hasText: 'PaperSync could not complete' })
    .getByRole('button', { name: 'Dismiss', exact: true })
    .click();
  await expect(homework).toHaveValue('Exercises 1–4, corrected');
  await expect(approve).toBeDisabled();
  await page
    .getByRole('button', { name: 'Use this week', exact: true })
    .click();
  await expect(approve).toBeEnabled();
  await expect(homework).toHaveValue('Exercises 1–4, corrected');
  await expect(page.getByLabel('Due date')).toHaveValue('2026-01-06');
  expect(modelRequests).toBe(requestsBeforeCorrection);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await expect(
    page.getByRole('button', { name: 'Dismiss', exact: true }),
  ).toHaveCount(0);
});

test('rescans collapse saved homework and allow deliberate corrections without losing typing focus', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  const [, imageData] = (await createPlannerImage(page)).split(',');
  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'rescan.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageData, 'base64'),
  });
  const oldEntry = { ...entry, action: 'skip' };
  const newEntry = {
    ...entry,
    content: 'An additional assignment',
    action: 'add',
  };
  let entries = [oldEntry, newEntry];
  await page.route('**/scan', async (route) => {
    if (!route.request().headers()['next-action']) {
      await route.continue();
      return;
    }
    const result = {
      success: true,
      data: { weekId: '2026-W01', entries, confidence: 1 },
      modelUsed: 'browser fixture',
    };
    await route.fulfill({
      contentType: 'text/x-component',
      body: `0:{"a":"$@1","f":"","b":"test"}\n1:${JSON.stringify(result)}\n`,
    });
  });
  const process = page.getByRole('button', { name: 'Process scan' });
  const approve = page.getByRole('button', { name: 'Approve and save' });
  await process.click();
  await expect(page.getByLabel('Task')).toHaveCount(1);
  await expect(page.getByLabel('Task')).toHaveValue(newEntry.content);
  await expect(approve).toBeEnabled();
  const saved = page.getByText('1 already saved — show entries');
  await saved.click();
  await expect(page.getByText(oldEntry.content, { exact: true })).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Review entry', exact: true }).click();
  const correction = page.getByLabel('Task').first();
  await correction.fill('Corrected');
  await correction.press('End');
  await page.keyboard.type(' homework');
  await expect(correction).toHaveValue('Corrected homework');
  await expect(correction).toBeFocused();
  entries = [oldEntry];
  await process.click();
  await expect(
    page.getByText('All recognized homework is already saved.'),
  ).toBeVisible();
  await expect(approve).toBeDisabled();
  await expect(page.getByLabel('Task')).toHaveCount(0);
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});

test('review retains informational entries and only excludes entries explicitly removed', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  const [, imageData] = (await createPlannerImage(page)).split(',');
  await expect(page.getByLabel('Select image from device')).toBeEnabled();
  await page.getByLabel('Select image from device').setInputFiles({
    name: 'all-entries.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageData, 'base64'),
  });
  const reference = 'Exam topics: chapters 3–5';
  const unwanted = 'Bring an umbrella';
  const recognizedContents = [entry.content, reference, unwanted];
  let saving = false;
  let savedRequest = '';
  await page.route('**/scan', async (route) => {
    if (!route.request().headers()['next-action']) {
      await route.continue();
      return;
    }
    if (saving) {
      savedRequest = route.request().postData() ?? '';
    }
    const result = saving
      ? { success: true, count: 2 }
      : {
          success: true,
          data: {
            weekId: '2026-W01',
            confidence: 1,
            entries: recognizedContents.map((content) => ({
              ...entry,
              content,
              action: 'add',
            })),
          },
        };
    await route.fulfill({
      contentType: 'text/x-component',
      body: `0:{"a":"$@1","f":"","b":"test"}\n1:${JSON.stringify(result)}\n`,
    });
  });
  await page.getByRole('button', { name: 'Process scan' }).click();
  await expect(page.getByLabel('Task')).toHaveCount(recognizedContents.length);
  await expect(page.getByLabel('Task').nth(1)).toHaveValue(reference);
  await page
    .getByRole('button', { name: `Remove entry: ${unwanted}`, exact: true })
    .click();
  await expect(page.getByLabel('Task')).toHaveCount(2);
  await expect(
    page.getByText('2 new or changed tasks will be queued', { exact: false }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  saving = true;
  await page.getByRole('button', { name: 'Approve and save' }).click();
  await expect(
    page.getByText('2 tasks waiting for Super Productivity.', { exact: false }),
  ).toBeVisible();
  expect(savedRequest).toContain(entry.content);
  expect(savedRequest).toContain(reference);
  expect(savedRequest).not.toContain(unwanted);
});
