import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';

for (const route of ['/', '/scan', '/planner', '/settings']) {
  test(`${route} is accessible after sign-in`, async ({ page, context }) => {
    await context.addCookies(await createSessionCookies());
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(route);
    const footer = page.locator('footer');
    await expect(
      footer.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible();
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

test('settings help and icon actions work with a keyboard', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/settings');
  const help = page
    .locator('summary')
    .filter({ hasText: 'How the plugin works' });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('The plugin creates tasks with due dates.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('The plugin creates tasks with due dates.', {
      exact: false,
    }),
  ).not.toBeVisible();

  const edit = page.getByRole('button', {
    name: 'Edit Chemistry',
    exact: true,
  });
  const tooltip = page.getByRole('tooltip', {
    name: 'Edit Chemistry',
    exact: true,
  });
  await edit.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(edit).toBeFocused();
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Monday class 1' }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page
    .getByRole('button', { name: 'Remove Monday class 1', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Monday class 1' }),
  ).toHaveCount(0);
});

test('shared styles preserve card spacing and heading sizes', async ({
  page,
  context,
  isMobile,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/settings');
  const heading = page.getByRole('heading', {
    name: 'Sync destination',
    exact: true,
  });
  await expect(heading).toHaveCSS('font-size', '20px');
  const header = heading.locator('..');
  await expect(header).toHaveCSS('padding-top', isMobile ? '20px' : '24px');
  await expect(header).toHaveCSS('padding-left', isMobile ? '20px' : '28px');
  const content = header.locator('xpath=following-sibling::*[1]');
  await expect(content).toHaveCSS('padding-top', isMobile ? '20px' : '24px');
  await expect(content).toHaveCSS('padding-left', isMobile ? '20px' : '28px');
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Self-hosted and open source.' }),
  ).toHaveCSS('font-size', '24px');
  await expect(
    page.getByRole('heading', { name: 'Set up your first school week.' }),
  ).toHaveCSS('font-size', '30px');
});

test('pointer tooltips respect touch devices and dismiss without moving focus', async ({
  page,
  context,
  isMobile,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/settings');
  const help = page
    .locator('summary')
    .filter({ hasText: 'How the plugin works' });
  await help.focus();
  await page
    .getByRole('button', { name: 'Edit Chemistry', exact: true })
    .hover();
  const tooltip = page.getByRole('tooltip', {
    name: 'Edit Chemistry',
    exact: true,
  });
  await expect(tooltip).toBeVisible({ visible: !isMobile });
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await expect(help).toBeFocused();
});
