import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';

for (const route of ['/', '/scan', '/planner', '/settings']) {
  test(`${route} is accessible after sign-in`, async ({ page, context }) => {
    await context.addCookies(await createSessionCookies());
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(route);
    expect(await scanWcag22AaViolations(page)).toEqual([]);
  });
}

test('private routes require sign-in and login is accessible', async ({
  page,
}) => {
  await page.goto('/scan');
  await expect(page).toHaveURL('/login');
  await expect(
    page.getByRole('button', { name: 'Sign in with GitHub' }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
});

test('subject editing closes with Escape and returns focus', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/settings');
  const open = page.getByRole('button', { name: 'Add subject', exact: true });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(open).toBeFocused();
});
