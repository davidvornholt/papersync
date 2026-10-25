import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';
import { expect, test as it } from '@playwright/test';
import { browserAuth, createSessionCookies } from './auth-fixture';

const conflictStatus = 409;
const forbiddenStatus = 403;
const redirectStatus = 307;
const plannerPath = /\/planner$/u;

const school = {
  subjects: [
    { id: 'demo-math', name: 'Mathematics' },
    { id: 'demo-arts', name: 'Arts' },
  ],
  timetable: [{ day: 'monday', subjectIds: ['demo-math'] }],
};

type StoredSettings = {
  readonly revision: string | null;
  readonly school: typeof school | null;
};

const storeDemoSchool = async (page: Page) => {
  await page.context().addCookies(await createSessionCookies());
  const previousResponse = await page.request.get('/api/settings');
  expect(previousResponse.ok()).toBe(true);
  const previous: StoredSettings = await previousResponse.json();
  const write = await page.request.put('/api/settings', {
    headers: { origin: browserAuth.baseUrl },
    data: { revision: previous.revision, school },
  });
  expect(write.ok(), await write.text()).toBe(true);
  const saved: StoredSettings = await write.json();
  return { previous, saved };
};

const restoreSchool = async (page: Page, previous: StoredSettings) => {
  const current = await (await page.request.get('/api/settings')).json();
  const restore = await page.request.put('/api/settings', {
    headers: { origin: browserAuth.baseUrl },
    data: {
      revision: current.revision,
      school: previous.school ?? { subjects: [], timetable: [] },
    },
  });
  expect(restore.ok()).toBe(true);
};

it('a saved timetable reaches another browser, autosaves edits, and rejects stale or cross-origin saves', async ({
  page,
  browser,
}) => {
  const { previous, saved } = await storeDemoSchool(page);
  const second = await browser.newContext({ baseURL: browserAuth.baseUrl });
  try {
    await second.addCookies(await createSessionCookies());
    const secondPage = await second.newPage();
    await secondPage.goto('/planner');
    const mondayRow = secondPage.getByRole('listitem').filter({
      hasText: 'Mon',
    });
    await expect(
      mondayRow.getByText('Mathematics', { exact: true }),
    ).toBeVisible();
    await expect(mondayRow.getByText('Arts', { exact: true })).toHaveCount(0);
    expect(await scanWcag22AaViolations(secondPage)).toEqual([]);
    await secondPage.goto('/settings');
    await expect(
      secondPage.getByRole('button', { name: 'Add Arts to Monday' }),
    ).toBeVisible();
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Add Arts to Monday' }).click();
    await expect(
      page.getByRole('status', { name: 'Save status' }),
    ).toContainText('Saved');
    await secondPage
      .getByRole('button', { name: 'Add Arts to Monday' })
      .click();
    await expect(
      secondPage.getByRole('status', { name: 'Save status' }),
    ).toContainText(
      'Your timetable changed in another browser. Reload before saving again.',
    );
    await secondPage.goto('/planner');
    await expect(
      secondPage
        .getByRole('listitem')
        .filter({ hasText: 'Mon' })
        .getByText('Arts', { exact: true }),
    ).toBeVisible();
    const stale = await second.request.put('/api/settings', {
      headers: { origin: browserAuth.baseUrl },
      data: { revision: saved.revision, school },
    });
    expect(stale.status()).toBe(conflictStatus);
    const crossOrigin = await second.request.put('/api/settings', {
      headers: { origin: 'https://untrusted.example' },
      data: { revision: saved.revision, school },
    });
    expect(crossOrigin.status()).toBe(forbiddenStatus);
    const anonymous = await browser.newContext({
      baseURL: browserAuth.baseUrl,
    });
    try {
      const response = await anonymous.request.get('/api/settings', {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(redirectStatus);
    } finally {
      await anonymous.close();
    }
  } finally {
    await restoreSchool(page, previous);
    await second.close();
  }
});

it('an edit made right before leaving Settings stays on screen and is saved', async ({
  page,
}) => {
  const { previous } = await storeDemoSchool(page);
  const navigation = page.getByRole('navigation', { name: 'Primary' });
  const removeArts = page.getByRole('button', {
    name: 'Remove Arts from Monday',
  });
  try {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Add Arts to Monday' }).click();
    // Leave within the autosave delay, then come back to the kept screen.
    await navigation.getByRole('link', { name: 'Planner' }).click();
    await expect(page).toHaveURL(plannerPath);
    await navigation.getByRole('link', { name: 'Settings' }).click();
    await expect(
      page.getByRole('status', { name: 'Save status' }),
    ).toContainText('Saved');
    await expect(removeArts).toBeVisible();
    await page.reload();
    await expect(removeArts).toBeVisible();
  } finally {
    await restoreSchool(page, previous);
  }
});
