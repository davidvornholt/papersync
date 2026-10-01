import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect } from '@playwright/test';
import { createSessionCookies } from './auth-fixture';
import { test } from './settings-fixture';

type ManifestIcon = { readonly src: string; readonly purpose?: string };

test('the app can be installed and opens on Scan', async ({
  page,
  request,
}) => {
  await page.goto('/login');
  // biome-ignore lint/security/noSecrets: A CSS attribute selector, not a credential.
  await expect(page.locator('link[rel=manifest]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({
    name: 'PaperSync',
    // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
    start_url: '/scan',
    display: 'standalone',
  });
  const icons: ReadonlyArray<ManifestIcon> = manifest.icons;
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  const iconTypes = await Promise.all(
    icons.map(
      async (icon) =>
        (await request.get(icon.src)).headers()['content-type'] ?? '',
    ),
  );
  expect(iconTypes.every((type) => type === 'image/png')).toBe(true);

  // Browser chrome needs a literal color; it must render as the theme's paper.
  const themeColor = await page
    .locator('meta[name=theme-color]')
    .getAttribute('content');
  expect(manifest.theme_color).toBe(themeColor);
  const [paper, meta] = await page.evaluate((metaColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 1;
    const drawing = canvas.getContext('2d', { willReadFrequently: true });
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-paper')
      .trim();
    if (!drawing) {
      return [];
    }
    drawing.fillStyle = token;
    drawing.fillRect(0, 0, 1, 1);
    drawing.fillStyle = metaColor ?? '';
    drawing.fillRect(1, 0, 1, 1);
    const [red, green, blue, , metaRed, metaGreen, metaBlue] =
      drawing.getImageData(0, 0, 2, 1).data;
    return [
      [red, green, blue].join(','),
      [metaRed, metaGreen, metaBlue].join(','),
    ];
  }, themeColor);
  expect(paper).toBe(meta);
});

test('the installed app shows an offline page instead of a browser error', async ({
  page,
  context,
}) => {
  await context.addCookies(await createSessionCookies());
  await page.goto('/scan');
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'You’re offline', level: 1 }),
  ).toBeVisible();
  expect(await scanWcag22AaViolations(page)).toEqual([]);
  await context.setOffline(false);
  await page.getByRole('link', { name: 'Try again' }).click();
  await expect(page).toHaveURL('/scan');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
