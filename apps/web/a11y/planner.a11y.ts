import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test as it, test } from '@playwright/test';
import { defaultSettings } from '../src/shared/hooks/use-settings-schema';
import { createSessionCookies } from './auth-fixture';

const timetable = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(
  (day) => ({
    day,
    slots: [{ id: `${day}-1`, subjectId: 'math' }],
  }),
);
const plannerSettings = {
  ...defaultSettings,
  subjects: [{ id: 'math', name: 'Math' }],
  timetable,
};

for (const timezoneId of ['Europe/Berlin', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    it.use({ timezoneId });
    for (const date of ['2026-09-08T12:00:00', '2025-12-30T12:00:00']) {
      it(`Tuesday exceptions stay on Tuesday on ${date}`, async ({
        page,
        context,
      }) => {
        await context.addCookies(await createSessionCookies());
        await page.clock.setFixedTime(new Date(date));
        await page.addInitScript((settings) => {
          localStorage.setItem('papersync-settings', JSON.stringify(settings));
        }, plannerSettings);
        await page.goto('/planner');
        const tuesday = page
          .getByRole('listitem')
          .filter({ has: page.getByText('Tue', { exact: true }) });
        const monday = page
          .getByRole('listitem')
          .filter({ has: page.getByText('Mon', { exact: true }) });
        await page
          .getByRole('button', { name: 'Exception for Tuesday' })
          .click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Tuesday');
        await dialog.getByLabel('Reason (optional)').fill('Museum visit');
        await dialog.getByRole('button', { name: 'Remove class' }).click();
        expect(await scanWcag22AaViolations(page)).toEqual([]);
        await dialog
          .getByRole('button', { name: 'Add exception', exact: true })
          .click();
        await expect(tuesday).toContainText('Museum visit');
        await expect(tuesday).toContainText('No classes');
        await expect(monday).not.toContainText('Museum visit');
        await expect(monday).toContainText('Math');
        await tuesday
          .getByRole('button', { name: 'Exception for Tuesday' })
          .click();
        await expect(dialog.getByLabel('Reason (optional)')).toHaveValue(
          'Museum visit',
        );
        await dialog.getByLabel('Reason (optional)').fill('Museum trip');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(tuesday).toContainText('Museum trip');
        const { promise: generationHeld, resolve: releaseGeneration } =
          Promise.withResolvers<void>();
        let requests = 0;
        await page.route('**/api/planner', async (route) => {
          requests += 1;
          if (requests === 1) {
            await generationHeld;
          }
          const payload = route.request().postDataJSON();
          expect(payload.timetable).toEqual(
            timetable.map((day) =>
              day.day === 'tuesday' ? { ...day, slots: [] } : day,
            ),
          );
          await route.fulfill({
            contentType: 'application/pdf',
            body: '%PDF-1.4\n%%EOF',
          });
        });
        await page
          .getByRole('button', { name: 'Generate PDF', exact: true })
          .click();
        await expect(
          page.getByText('Generating PDF…', { exact: true }),
        ).toBeVisible();
        await tuesday
          .getByRole('button', { name: 'Exception for Tuesday' })
          .click();
        await dialog
          .getByLabel('Reason (optional)')
          .fill('Museum trip, updated');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        const staleResponse = page.waitForResponse('**/api/planner');
        releaseGeneration();
        await staleResponse;
        await expect(
          page.getByText('Review the schedule, then generate your PDF'),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Download', exact: true }),
        ).toHaveCount(0);
        await page
          .getByRole('button', { name: 'Generate PDF', exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: 'Download', exact: true }),
        ).toBeVisible();
        await tuesday
          .getByRole('button', { name: 'Exception for Tuesday' })
          .click();
        await dialog
          .getByRole('button', { name: 'Remove exception', exact: true })
          .click();
        await expect(tuesday).not.toContainText('Museum trip');
        await expect(tuesday).toContainText('Math');
        await expect(
          tuesday.getByRole('button', { name: 'Exception for Tuesday' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Download', exact: true }),
        ).toHaveCount(0);
        expect(await scanWcag22AaViolations(page)).toEqual([]);
      });
    }
  });
}
