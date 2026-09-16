import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';
import { acknowledgementCount, importedTags, openImport } from './host-fixture';

test('matches subject tags, requires unmatched choices, and supports keyboard import', async ({
  page,
}) => {
  await openImport(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Math', { exact: true })).toHaveValue('0');
  await expect(dialog.getByLabel('English', { exact: true })).toHaveValue('1');
  await expect(dialog.getByLabel('Science', { exact: true })).toHaveValue('');
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('subject-tags-after.png'),
  });
  await dialog.getByLabel('Science', { exact: true }).selectOption('none');
  await dialog.getByRole('button', { name: 'Import homework' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'Imported 3 homework tasks.',
  );
  expect(await importedTags(page)).toEqual([['math'], ['english'], []]);
});

test('does not import or acknowledge an unresolved subject', async ({
  page,
}) => {
  await openImport(page);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import homework' })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Choose a tag or “No tag” for Science',
  );
  expect(await importedTags(page)).toEqual([]);
  expect(await acknowledgementCount(page)).toBe(0);
});

test('ambiguous names require a choice and automatic matches can be overridden', async ({
  page,
}) => {
  await openImport(
    page,
    ['Math', 'English'],
    [
      { id: 'math-1', title: 'Math' },
      { id: 'math-2', title: 'MATH' },
      { id: 'english', title: 'English' },
    ],
  );
  await expect(page.getByLabel('Math', { exact: true })).toHaveValue('');
  await page.getByLabel('Math', { exact: true }).selectOption('1');
  await page.getByLabel('English', { exact: true }).selectOption('none');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import homework' })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Imported 2 homework tasks.',
  );
  expect(await importedTags(page)).toEqual([['math-2'], []]);
});

test('empty tag lists and escaped subject names remain accessible and cancellable', async ({
  page,
}) => {
  await openImport(page, ['Art <design> & "craft"'], []);
  await expect(page.getByLabel('Art <design> & "craft"')).toHaveValue('');
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await importedTags(page)).toEqual([]);
  expect(await acknowledgementCount(page)).toBe(0);
});
